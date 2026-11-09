import {Dexie, type Table} from 'dexie';
import {parseConfiguration, type Configuration} from '../core/model.js';
import {emptyConfiguration} from '../core/editor.js';
interface Record {id: 'main';revision: number;config: Configuration}
/** One aggregate per commit keeps references, schedules and settings atomic. */
export class Repository {
  readonly db: Dexie;
  private records: Table<Record,string>;
  constructor(name='corgi-tv'){
    this.db=new Dexie(name);this.db.version(1).stores({configurations:'id'});this.records=this.db.table('configurations');
  }
  async load(): Promise<{config:Configuration;revision:number}>{
    const record=await this.records.get('main');
    return record?{config:parseConfiguration(record.config),revision:record.revision}:{config:structuredClone(emptyConfiguration),revision:0};
  }
  async save(input: Configuration, expectedRevision: number): Promise<number>{
    const config=parseConfiguration(input);
    return this.db.transaction('rw',this.records,async()=>{
      const old=await this.records.get('main');
      if((old?.revision??0)!==expectedRevision)throw Error('配置已在另一个标签页更新，请重新载入后再编辑。');
      const revision=expectedRevision+1;await this.records.put({id:'main',revision,config});return revision;
    });
  }
}
