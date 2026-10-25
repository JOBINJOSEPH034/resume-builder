import { Play, ArrowUpRight } from 'lucide-react';

export function youtubeEmbed(value) {
  try {
    const url=new URL(value);
    if(url.protocol!=='https:'||!['youtube.com','www.youtube.com','m.youtube.com','youtu.be'].includes(url.hostname))return null;
    const parts=url.pathname.split('/').filter(Boolean);
    const id=url.hostname==='youtu.be'?parts[0]:url.pathname==='/watch'?url.searchParams.get('v'):['embed','shorts','live'].includes(parts[0])?parts[1]:null;
    return /^[A-Za-z0-9_-]{11}$/.test(id||'')?`https://www.youtube-nocookie.com/embed/${id}?rel=0`:null;
  }catch{return null;}
}

export default function LearningMaterials({videos,section}) {
  const list=section?videos.filter(item=>item.section===section):videos;
  if(!list.length)return <div className="rc-empty"><span className="rc-empty-icon"><Play size={25}/></span><h3>More guidance is on its way</h3><p>Published videos, written lessons and learning resources will appear here.</p></div>;
  return <div className="rc-video-grid">{list.map(video=>{
    const embed=youtubeEmbed(video.youtube_url);
    return <article className="rc-video" key={video.id}>{embed?<iframe className="rc-video-player" title={video.title} src={embed} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin"/>:<div className={`rc-video-art rc-tone-${video.section}`}><Play size={28}/><span>{video.duration||'Written guide'}</span></div>}<small>{video.section==='cover'?'Cover letters':video.section}{video.duration?` · ${video.duration}`:''}</small><h3>{video.title}</h3><p>{video.description}</p>{video.written_content&&<div className="rc-lesson-text">{video.written_content}</div>}{video.material_url&&<a className="rc-video-link" href={video.material_url} target="_blank" rel="noreferrer">Open additional material <ArrowUpRight size={13}/></a>}{video.youtube_url&&!embed&&<p className="rc-fine">This video link cannot be embedded. Please contact support.</p>}</article>;
  })}</div>;
}
