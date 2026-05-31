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
    // 只拉取有影评的条目（后端筛选）
    fetchItems({ has_review: '1', limit: 50, sort: 'date_desc' }).then(res => {
      setReviews(res.items || []);
    });
  }, []);

  const goToList = useCallback((params) => {
    const qs = new URLSearchParams(params).toString();
    navigate(`/?${qs}`);
  }, [navigate]);

  if (!data) return <p className="loading">加载中...</p>;

  const { summary, ratingDistribution, avgByCategory, avgByDirector, avgByYear, tagPreference } = data;

  return (
    <div className="profile-page">
      <h2>我的电影</h2>
      <p className="profile-subtitle">观影记录 · 我的评分 · 个人分析</p>

      <div className="profile-summary">
        <div className="stat-card clickable" onClick={() => goToList({ watched: '1' })} title="点击查看已看电影">
          <div className="stat-icon">📽️</div>
          <div className="stat-value">{summary.watched || 0}</div>
          <div className="stat-label">已看 →</div>
        </div>
        <div className="stat-card" onClick={() => goToList({ sort: 'rating_desc' })} title="点击查看评分排行">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{summary.avgRating || '-'}</div>
          <div className="stat-label">我的均分 →</div>
        </div>
        <div className="stat-card clickable" onClick={() => goToList({ watched: '0' })} title="点击查看未看电影">
          <div className="stat-icon">👀</div>
          <div className="stat-value">{summary.watching || 0}</div>
          <div className="stat-label">在看 →</div>
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
      </div>

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
                <Chart option={{
                  title: { text: '我的导演偏好', left: 'center', textStyle: { fontSize: 14 } },
                  tooltip: {},
                  xAxis: { data: avgByDirector.map(d => d.director), axisLabel: { rotate: 30, fontSize: 11 } },
                  yAxis: {},
                  series: [{ type: 'bar', data: avgByDirector.map(d => d.avg_rating), itemStyle: { color: '#ee6666' } }],
                  grid: { bottom: 80 },
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
