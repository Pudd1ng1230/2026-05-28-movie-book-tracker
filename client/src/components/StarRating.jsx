/**
 * StarRating — 1-10 星快速评分组件
 * @param {number|null} rating — 当前评分
 * @param {function} onRate — 点击回调 (n: number) => void
 * @param {boolean} showLabel — 是否显示 "X分" 标签
 */
export default function StarRating({ rating, onRate, showLabel = false }) {
  return (
    <div className="quick-rate">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <span
          key={n}
          className={`star ${rating && n <= rating ? 'active' : ''}`}
          onClick={() => onRate(n)}
          title={`${n}分`}
        >
          ★
        </span>
      ))}
      {showLabel && rating && (
        <span className="user-rating-label">{rating}分</span>
      )}
    </div>
  );
}
