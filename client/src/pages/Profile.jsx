import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [tab, setTab] = useState('analytics');

  useEffect(() => {
    fetchPersonalAnalytics().then(setData);
    fetchItems({ has_review: '1', limit: 50, sort: 'date_desc' }).then(res => {
      setReviews(res.items || []);
    });
  }, []);

  const goToList = useCallback((params) => {
    navigate(`/?${new URLSearchParams(params).toString()}`);
  }, [navigate]);

  if (!data) return <p className="loading">加载中...</p>;

  const {
    summary, ratingDistribution, avgByCategory, avgByDirector,
    progressDistribution, userVsDouban, yearDistribution,
    regionDistribution, actorPreference, ratingTiers,
  } = data;

  return (
    <div className="profile-page">
      <h2>我的电影</h2>
      <p className="profile-subtitle">观影记录 · 我的评分 · 个人分析</p>

      {/* 概览卡片 */}
      <div className="profile-summary">
        <div className="stat-card clickable" onClick={() => goToList({ watched: '1' })} title="点击查看已看电影">
          <div className="stat-icon">📽️</div>
          <div className="stat-value">{summary.watched || 0}</div>
          <div className="stat-label">已看 →</div>
        </div>
        <div className="stat-card clickable" onClick={() => goToList({ sort: 'rating_desc' })}>
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{summary.avgRating || '-'}</div>
          <div className="stat-label">我的均分 →</div>
        </div>
        <div className="stat-card clickable">
          <div className="stat-icon">👀</div>
          <div className="stat-value">{summary.watching || 0}</div>
          <div className="stat-label">在看</div>
        </div>
        <div className="stat-card clickable">
          <div className="stat-icon">📌</div>
          <div className="stat-value">{summary.wantWatch || 0}</div>
          <div className="stat-label">想看</div>
        </div>
        <div className="stat-card clickable">
          <div className="stat-icon">📝</div>
          <div className="stat-value">{summary.total || 0}</div>
          <div className="stat-label">互动总数</div>
        </div>
        {ratingTiers && (
          <>
            <div className="stat-card"><div className="stat-icon">🔥</div><div className="stat-value" style={{color:'#ee6666'}}>{ratingTiers.high}</div><div className="stat-label">高分 (≥8)</div></div>
            <div className="stat-card"><div className="stat-icon">👍</div><div className="stat-value" style={{color:'#f5a623'}}>{ratingTiers.mid}</div><div className="stat-label">中等 (5-7)</div></div>
            <div className="stat-card"><div className="stat-icon">👎</div><div className="stat-value" style={{color:'#999'}}>{ratingTiers.low}</div><div className="stat-label">低分 (≤4)</div></div>
          </>
        )}
      </div>

      {/* Tab 切换 */}
      <div className="profile-tabs">
        <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}>
          📊 个人分析
        </button>
        <button className={tab === 'reviews' ? 'active' : ''} onClick={() => setTab('reviews')}>
          📝 我的影评
        </button>
      </div>

      {tab === 'analytics' && (
        <>
          {/* 高分榜 */}
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
            {/* 评分分布 */}
            {ratingDistribution.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '我的评分分布', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: {},
                  xAxis: { data: ratingDistribution.map(d => d.bucket), axisLabel: { fontSize: 11 } },
                  yAxis: {},
                  series: [{ type: 'bar', data: ratingDistribution.map(d => d.count), itemStyle: { color: '#5470c6' } }],
                  grid: { bottom: 40 },
                }} />
              </div>
            )}

            {/* 进度饼图 */}
            {progressDistribution && progressDistribution.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '观看进度分布', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: { trigger: 'item', formatter: '{b}: {c} 部 ({d}%)' },
                  series: [{
                    type: 'pie', radius: ['40%', '70%'],
                    data: progressDistribution.map(d => ({ name: d.name, value: d.value })),
                    itemStyle: { borderRadius: 4 },
                    label: { show: true, formatter: '{b}\n{c}部' },
                  }],
                  color: ['#ee6666', '#f5a623', '#91cc75', '#5470c6'],
                }} />
              </div>
            )}

            {/* 我的评分 vs 豆瓣评分 */}
            {userVsDouban && userVsDouban.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '我的评分 vs 豆瓣评分', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: {
                    trigger: 'item',
                    formatter: p => `${p.value[2]}<br/>我的: ${p.value[0]}　豆瓣: ${p.value[1]}`,
                  },
                  xAxis: { name: '我的评分', min: 0, max: 10, nameTextStyle: { fontSize: 11 } },
                  yAxis: { name: '豆瓣评分', min: 0, max: 10, nameTextStyle: { fontSize: 11 } },
                  series: [{
                    type: 'scatter',
                    data: userVsDouban.map(d => [d.user_rating, d.douban_rating, d.name]),
                    symbolSize: 8,
                    itemStyle: { color: '#5470c6', opacity: 0.6 },
                  }],
                  grid: { top: 40, bottom: 40 },
                }} />
              </div>
            )}

            {/* 分类偏好 */}
            {avgByCategory.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '我的分类偏好', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: {},
                  xAxis: { data: avgByCategory.slice(0, 12).map(d => d.category), axisLabel: { rotate: 30, fontSize: 10 } },
                  yAxis: { min: 0, max: 10 },
                  series: [{ type: 'bar', data: avgByCategory.slice(0, 12).map(d => d.avg_rating), itemStyle: { color: '#91cc75' } }],
                  grid: { bottom: 80 },
                }} />
              </div>
            )}

            {/* 观影年份分布 */}
            {yearDistribution && yearDistribution.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '观影年份分布', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: { trigger: 'axis' },
                  xAxis: { data: yearDistribution.map(d => d.year), axisLabel: { rotate: 30, fontSize: 10 } },
                  yAxis: {},
                  series: [{ type: 'bar', data: yearDistribution.map(d => d.count), itemStyle: { color: '#ee6666' } }],
                  grid: { bottom: 60 },
                }} />
              </div>
            )}

            {/* 导演偏好 */}
            {avgByDirector.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '我的导演偏好', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: {},
                  xAxis: { data: avgByDirector.map(d => d.director), axisLabel: { rotate: 30, fontSize: 10 } },
                  yAxis: {},
                  series: [{ type: 'bar', data: avgByDirector.map(d => d.avg_rating), itemStyle: { color: '#f5a623' } }],
                  grid: { bottom: 80 },
                }} />
              </div>
            )}

            {/* 地区分布 */}
            {regionDistribution && regionDistribution.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '观影地区分布', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: {},
                  xAxis: { data: regionDistribution.slice(0, 15).map(d => d.name), axisLabel: { rotate: 30, fontSize: 10 } },
                  yAxis: {},
                  series: [{ type: 'bar', data: regionDistribution.slice(0, 15).map(d => d.value), itemStyle: { color: '#5470c6' } }],
                  grid: { bottom: 60 },
                }} />
              </div>
            )}

            {/* 演员偏好 */}
            {actorPreference && actorPreference.length > 0 && (
              <div className="chart-card">
                <Chart option={{
                  title: { text: '演员出现频次 Top15', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                  grid: { left: '3%', right: '4%', bottom: 60, containLabel: true },
                  xAxis: { type: 'value' },
                  yAxis: { type: 'category', data: actorPreference.map(d => d.name).reverse(), axisLabel: { fontSize: 10 }, inverse: true },
                  series: [{
                    type: 'bar', data: actorPreference.map(d => d.count).reverse(),
                    itemStyle: { color: '#91cc75' },
                    label: { show: true, position: 'right', fontSize: 10, formatter: '{c}' },
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
                    {item.poster ? <img src={item.poster} alt={item.name} loading="lazy" /> : <span style={{fontSize:16}}>🎬</span>}
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
