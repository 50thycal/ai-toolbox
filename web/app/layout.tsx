import './learning.css';
import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'AI Toolbox · A place for useful repos',description:'Discover GitHub repositories, browse project-fit reviews, and build your development toolbox.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
