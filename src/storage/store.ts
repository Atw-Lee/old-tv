import {Repository} from './repository.js';
import {TVController} from '../core/tv-controller.js';
import {parseConfiguration, type Configuration} from '../core/model.js';
import {emptyConfiguration,friendlyError} from '../core/editor.js';
interface Snapshot {config:Configuration;ready:boolean;busy:boolean;error:string;notice:string}
export class AppStore {
  readonly controller=new TVController(emptyConfiguration);
  private state:Snapshot={config:structuredClone(emptyConfiguration),ready:false,busy:false,error:'',notice:''};
  private revision=0;
  private listeners=new Set<()=>void>();
  private tail:Promise<void>=Promise.resolve();
  constructor(readonly repository=new Repository()){}
  getSnapshot=()=>this.state;
  subscribe=(callback:()=>void)=>{this.listeners.add(callback);return()=>{this.listeners.delete(callback);};};
  private publish(patch:Partial<Snapshot>){this.state={...this.state,...patch};for(const listener of this.listeners)listener();}
  load=async()=>{
    this.publish({busy:true,error:''});
    try{const {config,revision}=await this.repository.load();this.revision=revision;this.controller.replaceConfiguration(config);if(config.settings.lastChannelId&&this.controller.getSnapshot().channels.some(c=>c.id===config.settings.lastChannelId))this.controller.selectChannel(config.settings.lastChannelId);this.publish({config,ready:true,notice:'已载入本机配置'});}
    catch(e){this.publish({error:`读取失败：${friendlyError(e)}。未覆盖原数据。`,ready:false});}
    finally{this.publish({busy:false});}
  };
  commit=(input:Configuration,importing=false):Promise<void>=>this.enqueue(async()=>{
    const config=parseConfiguration(input);
    if(!importing){config.settings={...this.state.config.settings};if(config.settings.lastChannelId&&!config.channels.some(c=>c.id===config.settings.lastChannelId))delete config.settings.lastChannelId;}
    await this.persist(config);
    this.controller.replaceConfiguration(config);
    if(importing&&config.settings.lastChannelId&&this.controller.getSnapshot().channels.some(c=>c.id===config.settings.lastChannelId))this.controller.selectChannel(config.settings.lastChannelId);
  });
  private async persist(config:Configuration){const revision=await this.repository.save(config,this.revision);this.revision=revision;this.publish({config,notice:'已保存到本机'});}
  private enqueue(work:()=>Promise<void>):Promise<void>{
    const result=this.tail.then(async()=>{
      if(!this.state.ready)throw Error('本地数据未成功载入，请先重新载入');
      this.publish({busy:true,error:'',notice:'正在保存…'});
      try{await work();}catch(e){this.publish({error:`保存失败：${friendlyError(e)} 未覆盖已保存配置。`,notice:''});throw e;}
      finally{this.publish({busy:false});}
    });
    this.tail=result.catch(()=>{});return result;
  }
  savePreferences=()=>{
    const current=this.controller.getSnapshot();const volume=current.volume,channelId=current.channelId;
    return this.enqueue(async()=>{
      const config=structuredClone(this.state.config);config.settings.volume=volume;
      if(channelId&&config.channels.some(c=>c.id===channelId))config.settings.lastChannelId=channelId;else delete config.settings.lastChannelId;
      await this.persist(config);
    });
  };
}
