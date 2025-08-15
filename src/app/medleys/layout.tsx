import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'メドレー一覧 | ニコニコメドレーアノテーションプレイヤー',
    description: '登録されているメドレー楽曲の一覧ページ。タイトル、作者、楽曲名での検索やジャンルでのフィルタリングが可能です。',
    openGraph: {
        title: 'メドレー一覧 | ニコニコメドレーアノテーションプレイヤー',
        description: '登録されているメドレー楽曲の一覧ページ。タイトル、作者、楽曲名での検索やジャンルでのフィルタリングが可能です。',
        url: 'https://anasui.netlify.app/medleys',
    },
    twitter: {
        title: 'メドレー一覧 | ニコニコメドレーアノテーションプレイヤー',
        description: '登録されているメドレー楽曲の一覧ページ。タイトル、作者、楽曲名での検索やジャンルでのフィルタリングが可能です。',
    },
};

interface MedleysLayoutProps {
    children: React.ReactNode;
}

export default function MedleysLayout({ children }: MedleysLayoutProps) {
    return <>{children}</>;
}