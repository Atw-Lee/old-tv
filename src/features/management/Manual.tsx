import {useState} from 'react';
import {Button} from '../../components/ui/button.js';
const instructions={
  '点播 HLS':['复制播放清单地址','从提供方复制可外部播放的 .m3u8 点播链接。直播清单和普通网页地址不能用于每日排片。','选择「点播 HLS / M3U8」，填写名称并粘贴链接。浏览器会读取清单时长；读取失败时，检查来源是否允许跨站访问。'],
  'YouTube':['复制视频链接','在视频页点击「分享」复制链接，也可复制 11 位视频 ID。请选择允许嵌入的点播视频。','选择「YouTube」并粘贴链接或 ID。播放器读到时长后仍可继续预览。如果浏览器阻止播放，点击小窗口里的播放按钮即可。'],
  'Bilibili':['复制视频地址或 BV 号','打开视频页，复制完整 bilibili.com 视频链接或 BV 号。多集视频请复制带 p 参数的当前集地址；短链接请先打开。','选择「Bilibili」，粘贴地址，查看下方播放器的总时长，在时长选择器中选取对应值（例如 01:10:30）。填写后可按北京时间循环或切到无信号；缓冲或暂停不会推迟切换。'],
} as const;
const example={'点播 HLS':'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8','YouTube':'https://youtu.be/M7lc1UVf-VE','Bilibili':'https://www.bilibili.com/video/BV1B7411m7LV?p=2'};
const categories = ['点播 HLS', 'YouTube', 'Bilibili', '体验预设频道'] as const;

export function Manual({onPreset}: {onPreset: () => void}) {
  const [category, setCategory] = useState<typeof categories[number]>('点播 HLS');
  return (
    <div className="manual-layout">
      <nav aria-label="手册分类">
        {categories.map(item => (
          <Button key={item} type="button" variant={category === item ? 'default' : 'ghost'}
            aria-pressed={category === item} onClick={() => setCategory(item)}>
            {item}
          </Button>
        ))}
      </nav>
      {category === '体验预设频道' ? (
        <article aria-label={category}>
          <p>预设包含三个全天循环的频道：HLS试播台、YouTube 试播台和 B站试播台。导入到草稿后点「保存」，打开电视即可试看。</p>
          <Button type="button" variant="outline" onClick={onPreset}>应用预设配置文件</Button>
        </article>
      ) : (
        <article aria-label={category + '添加步骤'}>
          <ol>
            <li><strong>{instructions[category][0]}</strong><p>{instructions[category][1]}</p>
              <div className="manual-example">链接示例<code>{example[category]}</code></div>
            </li>
            <li><strong>添加视频源</strong><p>打开「视频源 → 新增视频源」。{instructions[category][2]}</p></li>
            <li><strong>安排播出</strong><p>点击「完成」，在「排片」中选择频道和视频源。检查起止时间及「播完后」，最后点击抽屉右下角「保存」。</p></li>
          </ol>
        </article>
      )}
    </div>
  );
}
