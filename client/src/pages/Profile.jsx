import { useState, useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import { fetchPersonalAnalytics, fetchItems } from '../api';

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

export default function Profile() {
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('analytics');

  useEffect(() => {
    fetchPersonalAnalytics().then(setData);
    // 拉取有影评的电影
    fetchItems({ sort: 'date_desc' }).then(items => {
      setReviews(items.filter(i => i.review || (i.rating && i.watched)));
    });
  }, []);

  if (!data) return <p className="loading">加载中...</p>;

  const { summary, ratingDistribution, avgByCategory, avgByDirector, avgByYear, timeline, tagPreference } = data;

  const barOption = (title, xData, yData, color) => ({
    title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
    tooltip: {},
    xAxis: { data: xData, axisLabel: { rotate: 30, fontSize: 11 } },
    yAxis: {},
    series: [{ type: 'bar', data: yData, itemStyle: { color: color || '#5470c6' } }],
    grid: { bottom: 80 },
  });

  return (
    <div className="profile-page">
      <h2>我的电影</h2>
      <p className="profile-subtitle">
        观影记录 · 我的评分 · 个人分析
      </p>

      {/* 概览卡片 */}
      <div className="profile-summary">
        <div className="stat-card">
          <div className="stat-icon">📽️</div>
          <div className="stat-value">{summary.watched || 0}</div>
          <div className="stat-label">已看</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{summary.avgRating || '-'}</div>
          <div className="stat-label">我的均分</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👀</div>
          <div className="stat-value">{summary.watching || 0}</div>
          <div className="stat-label">在看</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📌</div>
          <div className="stat-value">{summary.wantWatch || 0}</div>
          <div className="stat-label">想看</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{summary.total || 0}</div>
          <div className="stat-label">互动总数</div>
        </div>
      </div>

      {/* Tab 切换 */}
      <div className="profile-tabs">
        <button
          className={tab === 'analytics' ? 'active' : ''}
          onClick={() => setTab('analytics')}
        >
          📊 个人分析
        </button>
        <button
          className={tab === 'reviews' ? 'active' : ''}
          onClick={() => setTab('reviews')}
        >
          📝 我的影评
        </button>
      </div>

      {tab === 'analytics' && (
        <>
          {/* 个人高分榜 */}
          {summary.topRated && summary.topRated.length > 0 && (
            <div className="top-rated">
              <h3>🏆 我的高分榜</h3>
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
                <Chart option={barOption('我的评分分布', ratingDistribution.map(d => d.bucket), ratingDistribution.map(d => d.count), '#5470c6')} />
              </div>
            )}

            {avgByCategory.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '我的分类偏好', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: {},
                  xAxis: { data: avgByCategory.map(d => d.category), axisLabel: { rotate: 30, fontSize: 11 } },
                  yAxis: { min: 0, max: 10 },
                  series: [{ type: 'bar', data: avgByCategory.map(d => d.avg_rating), itemStyle: { color: '#91cc75' } }],
                  grid: { bottom: 80 },
                }} />
              </div>
            )}

            {avgByDirector.length > 0 && (
              <div className="chart-card">
                <Chart option={barOption('我的导演偏好', avgByDirector.map(d => d.director), avgByDirector.map(d => d.avg_rating), '#ee6666')} />
              </div>
            )}

            {avgByYear.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '看过的年份趋势', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: { trigger: 'axis' },
                  xAxis: { data: avgByYear.map(d => d.year), axisLabel: { rotate: 30, fontSize: 11 } },
                  yAxis: { min: 0, max: 10 },
                  series: [{ type: 'line', data: avgByYear.map(d => d.avg_rating), smooth: true, itemStyle: { color: '#5470c6' } }],
                  grid: { bottom: 80 },
                }} />
              </div>
            )}

            {tagPreference.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '标签偏好', left: 'center', textStyle: { fontSize: 14 } },
                  radar: {
                    indicator: tagPreference.slice(0, 8).map(t => ({ name: t.name, max: Math.max(...tagPreference.map(x => x.value)) })),
                  },
                  series: [{
                    type: 'radar',
                    data: [{ value: tagPreference.slice(0, 8).map(t => t.value), name: '偏好' }],
                    itemStyle: { color: '#91cc75' },
                  }],
                }} />
              </div>
            )}
          </div>

          {ratingDistribution.length === 0 && avgByCategory.length === 0 && (
            <p className="empty">还没有打分记录，去 <a href="/">清单</a> 给电影打个分吧！</p>
          )}
        </>
      )}

      {tab === 'reviews' && (
        <>
          {reviews.length > 0 ? (
            <div className="profile-review-list">
              <h3>📝 我的影评 ({reviews.filter(r => r.review).length})</h3>
              {reviews.filter(r => r.review).map(item => (
                <div key={item.id} className="review-item">
                  <div className="review-poster">
                    {item.poster ? <img src={item.poster} alt={item.name} /> : <span style={{fontSize:16}}>🎬</span>}
                  </div>
                  <div className="review-body">
                    <div className="review-name">{item.name}</div>
                    <div className="review-text">"{item.review}"</div>
                  </div>
                  {item.rating && <div className="review-rating">★ {item.rating}</div>}
                </div>
              ))}
              {reviews.filter(r => r.review).length === 0 && (
                <p className="empty">还没有写过影评</p>
              )}
            </div>
          ) : (
            <p className="empty">还没有写过影评，去清单页给看过的电影写点感想吧！</p>
          )}
        </>
      )}
    </div>
  );
}
