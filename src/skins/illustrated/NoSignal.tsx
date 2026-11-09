export function NoSignal({empty=false}:{empty?:boolean}){
  return <div className="no-signal" data-testid="no-signal">
    <div className="color-bars" aria-hidden="true">{['#dbd8b9','#d6b94c','#66b6bb','#70a276','#ad6b9e','#b66d52','#49699f'].map(c=><span key={c} style={{background:c}}/>)}</div>
    <div className="signal-message"><span className="signal-cross" aria-hidden="true">＋</span><strong>暂无信号</strong><small>这一刻，留一点空白。</small><span className="signal-code">{empty?'尚无启用频道 · 按机身设置键添加':'NO SIGNAL · 请尝试切换频道'}</span></div>
    <div className="signal-bottom" aria-hidden="true"/>
  </div>;
}
