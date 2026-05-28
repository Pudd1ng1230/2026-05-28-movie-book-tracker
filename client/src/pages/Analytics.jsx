import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { fetchAnalytics } from '../api';

function Chart({ option }) {
  const ref = useRef(null);
  const chart = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    chart.current = echarts.init(ref.current);
    const handleResize = () => chart.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (chart.current) chart.current.setOption(option, true);
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height: 350 }} />;
}

export default function Analytics() {
  const [data, setData] = useState(null);

  useEffect(() => { fetchAnalytics().then(setData); }, []);

  if (!data) return <p className="loading">加载中...</p>;

  const { ratingDistribution, avgByCategory, avgByDirector, avgByYear, timeline, tagPreference, summary } = data;

  const barOption = (title, xData, yData) => ({
    title: { text: title, left: 'center' },
    tooltip: {},
    xAxis: { data: xData, axisLabel: { rotate: 30 } },
    yAxis: {},
    series: [{ type: 'bar', data: yData, itemStyle: { color: '#5470c6' } }],
    grid: { bottom: 80 },
  });

  return (
    <div className="analytics">
      <h2>数据分析看板</h2>

      <div className="summary-cards">
        <div className="card"><strong>总计</strong><span>{summary.total}</span></div>
        <div className="card"><strong>平均评分</strong><span>{summary.avgRating || '-'}</span></div>
        {summary.byType.map(t => (
          <div key={t.type} className="card"><strong>{t.type === 'movie' ? '电影' : t.type === 'tv' ? '剧集' : '书籍'}</strong><span>{t.count}</span></div>
        ))}
      </div>

      {summary.topRated.length > 0 && (
        <div className="top-rated">
          <h3>高分榜单</h3>
          <ol>
            {summary.topRated.map((item, i) => (
              <li key={i}>{item.name} ★{item.rating}</li>
            ))}
          </ol>
        </div>
      )}

      <div className="charts">
        {ratingDistribution.length > 0 && (
          <div className="chart-card">
            <Chart option={barOption('评分分布', ratingDistribution.map(d => d.bucket), ratingDistribution.map(d => d.count))} />
          </div>
        )}

        {avgByCategory.length > 0 && (
          <div className="chart-card">
            <Chart option={{
              title: { text: '分类平均分', left: 'center' },
              tooltip: {},
              xAxis: { data: avgByCategory.map(d => d.category), axisLabel: { rotate: 30 } },
              yAxis: { min: 0, max: 10 },
              series: [{ type: 'bar', data: avgByCategory.map(d => d.avg_rating), itemStyle: { color: '#91cc75' } }],
              grid: { bottom: 80 },
            }} />
          </div>
        )}

        {avgByDirector.length > 0 && (
          <div className="chart-card">
            <Chart option={barOption('导演/作者 平均分 Top10', avgByDirector.map(d => d.director), avgByDirector.map(d => d.avg_rating))} />
          </div>
        )}

        {avgByYear.length > 0 && (
          <div className="chart-card">
            <Chart option={{
              title: { text: '年份平均分趋势', left: 'center' },
              tooltip: { trigger: 'axis' },
              xAxis: { data: avgByYear.map(d => d.year), axisLabel: { rotate: 30 } },
              yAxis: { min: 0, max: 10 },
              series: [{ type: 'line', data: avgByYear.map(d => d.avg_rating), smooth: true, itemStyle: { color: '#ee6666' } }],
              grid: { bottom: 80 },
            }} />
          </div>
        )}

        {timeline.length > 0 && (
          <div className="chart-card">
            <Chart option={barOption('月度观看/阅读量', timeline.map(d => d.month), timeline.map(d => d.count))} />
          </div>
        )}

        {tagPreference.length > 0 && (
          <div className="chart-card">
            <Chart option={{
              title: { text: '标签偏好雷达图', left: 'center' },
              radar: {
                indicator: tagPreference.slice(0, 8).map(t => ({ name: t.name, max: Math.max(...tagPreference.map(x => x.value)) })),
              },
              series: [{
                type: 'radar',
                data: [{ value: tagPreference.slice(0, 8).map(t => t.value), name: '偏好' }],
                itemStyle: { color: '#5470c6' },
              }],
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
