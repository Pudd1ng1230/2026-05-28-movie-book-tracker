import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { fetchItem, fetchItemRanking, setProgress, updateItem } from '../api';
import Poster from '../components/Poster';

const PROGRESS_OPTIONS = ['', '想看', '在看', '已看'];

function RankRow({ label, data }) {
  if (!data || !data.total) return null;
  return (
    <div className="rank-row">
      <span className="rank-row-label">{label}</span>
      <span className="rank-row-value">#{data.rank} / {data.total}</span>
      <span className="rank-row-pct">前 {data.percentile}%</span>
    </div>
  );
}

export default function MovieDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [movie, setMovie] = useState(null);
  const [ranking, setRanking] = useState(null);
  const [review, setReview] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, r] = await Promise.all([
        fetchItem(id),
        fetchItemRanking(id).catch(() => null),
      ]);
      setMovie(m);
      setReview(m.review || '');
      if (r) setRanking(r.ranking);
    } catch (e) {
      setMovie(null);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleProgress = async (progress) => {
    const watchedVal = progress === '已看' ? 1 : 0;
    await setProgress(id, progress);
    setMovie(prev => ({ ...prev, watch_progress: progress, watched: watchedVal }));
  };

  const handleRate = async (rating) => {
    await updateItem(id, { rating });
    setMovie(prev => ({ ...prev, rating }));
  };

  const saveReview = async () => {
    await updateItem(id, { review });
    setMovie(prev => ({ ...prev, review }));
  };

  if (loading) return <p className="loading">加载中...</p>;
  if (!movie) return <p className="empty">电影不存在</p>;

  const categories = (movie.category || '').split('/').filter(Boolean);
  const actors = (movie.actors || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="movie-detail">
      <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>← 返回</button>

      <div className="detail-hero">
        <div className="detail-poster">
          <Poster src={movie.poster} alt={movie.name} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} />
        </div>
        <div className="detail-info">
          <h1>{movie.name}</h1>
          <div className="detail-meta-line">
            {movie.year && <span>{movie.year}</span>}
            {movie.director && <span>导演：{movie.director}</span>}
            {movie.regions && <span>{movie.regions}</span>}
          </div>

          {/* 评分 */}
          <div className="detail-ratings">
            <div className="detail-rating-block">
              <div className="detail-rating-value" style={{color:'#f5a623'}}>
                {movie.douban_rating ? `★ ${movie.douban_rating}` : '暂无'}
              </div>
              <div className="detail-rating-label">豆瓣评分</div>
              {movie.douban_votes && <div className="detail-rating-sub">{movie.douban_votes.toLocaleString()} 人评价</div>}
            </div>
            <div className="detail-rating-block">
              <div className="detail-rating-value" style={{color:'var(--primary)'}}>
                {movie.rating ? `★ ${movie.rating}` : '未打分'}
              </div>
              <div className="detail-rating-label">我的评分</div>
              <div className="quick-rate" style={{marginTop:6,justifyContent:'center'}}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <span key={n} className={`star ${movie.rating && n <= movie.rating ? 'active' : ''}`}
                    onClick={() => handleRate(n)} title={`${n}分`}>
                    {n <= 5 ? '★' : '☆'}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 进度 */}
          <div className="detail-progress">
            <span style={{color:'var(--text-muted)',fontSize:13}}>观影状态：</span>
            <select
              className={`progress-select ${movie.watch_progress === '想看' ? 'want' : movie.watch_progress === '在看' ? 'watching' : movie.watch_progress === '已看' ? 'watched-tag' : ''}`}
              value={movie.watch_progress || ''}
              onChange={e => handleProgress(e.target.value)}
            >
              {PROGRESS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt || '未设置'}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* 简介 */}
      {movie.summary && (
        <div className="detail-section">
          <h3>简介</h3>
          <p className="detail-summary">{movie.summary}</p>
        </div>
      )}

      {/* 标签 */}
      <div className="detail-tags">
        {categories.map(c => <span key={c} className="tag">{c}</span>)}
        {(movie.tags && JSON.parse(movie.tags || '[]')).map(t => (
          <span key={t} className="tag">{t}</span>
        ))}
      </div>

      {/* 演员 */}
      {actors.length > 0 && (
        <div className="detail-section">
          <h3>演员</h3>
          <div className="detail-tags">
            {actors.slice(0, 10).map(a => <span key={a} className="tag">{a}</span>)}
          </div>
        </div>
      )}

      {/* 排名 */}
      {ranking && (
        <div className="detail-section">
          <h3>排名</h3>
          <div className="detail-ranking-grid">
            <RankRow label="总排名" data={ranking.overall} />
            <RankRow label={`${movie.year || '?'} 年排名`} data={ranking.by_year} />
            <RankRow label={`${categories[0] || '?'} 类型排名`} data={ranking.by_category} />
            <RankRow label={`导演排名`} data={ranking.by_director} />
          </div>
        </div>
      )}

      {/* 影评 */}
      <div className="detail-section">
        <h3>我的影评</h3>
        <textarea
          className="detail-review-input"
          placeholder="写点感想..."
          value={review}
          onChange={e => setReview(e.target.value)}
          rows={4}
        />
        <button className="btn btn-primary" onClick={saveReview} style={{marginTop:8}}>保存影评</button>
      </div>

      {/* 其他信息 */}
      <div className="detail-section">
        <h3>其他信息</h3>
        <div className="detail-meta-grid">
          {movie.languages && <div><span className="meta-label">语言</span><span>{movie.languages}</span></div>}
          {movie.douban_id && <div><span className="meta-label">豆瓣 ID</span><span>{movie.douban_id}</span></div>}
          {movie.date && <div><span className="meta-label">添加日期</span><span>{movie.date}</span></div>}
        </div>
      </div>
    </div>
  );
}
