import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

/**
 * 通用 ECharts 图表组件
 * @param {object} option — ECharts 配置项
 */
export default function Chart({ option }) {
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
    if (!chart.current) return;
    // 仅覆盖 title 默认字号，其余使用 ECharts 亮色默认值
    const opt = {
      ...option,
      title: option.title ? {
        ...option.title,
        textStyle: { fontSize: 14, ...(option.title.textStyle || {}) },
      } : undefined,
    };
    chart.current.setOption(opt, true);
  }, [option]);

  return <div ref={ref} style={{ width: '100%', height: 350 }} />;
}
