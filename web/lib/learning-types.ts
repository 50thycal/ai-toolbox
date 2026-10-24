export type LessonSource = {id:string;label:string;url:string;kind:'code'|'documentation'|'patch';truncated?:boolean};
export type LessonNode = {id:string;label:string;detail:string;sourceIds:string[]};
export type LessonSection = {id:string;title:string;caption:string;kind:'flow'|'timeline'|'compare'|'states';evidence:'code'|'documentation'|'illustrative';nodes:LessonNode[];before?:string;after?:string;scenario?:{label:string;options:{label:string;result:string;path:string[]}[]}};
export type Lesson = {title:string;summary:string;objectives:string[];sections:LessonSection[]};
export type Topic = {id:string;repo:string;title:string;reason:string;kind:'repo'|'pr'|'group';prs:number[]};
export type LearningJob = {id:string;repo:string;question:string;status:'queued'|'running'|'ready'|'failed'|'interrupted';pass:number;createdAt:string;updatedAt:string;model:string;error?:string;lesson?:Lesson;snapshot?:{sha:string;fetchedAt:string;sources:LessonSource[];warnings:string[];prs:number[]};reviews:{pass:number;focus:string;changes:string[];openIssues:string[];checks:string[];at:string}[]};
