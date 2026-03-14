import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans, DM_Mono } from 'next/font/google';
import './globals.css';

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });
const dmSans   = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', weight: ['300','400','500','600'], display: 'swap' });
const dmMono   = DM_Mono({ subsets: ['latin'], variable: '--font-dm-mono', weight: ['400','500'], display: 'swap' });

export const metadata: Metadata = {
    title: 'LAMP Studio — Interior Design with 3D',
    description: 'Professional interior design platform with Three.js 3D visualization and MongoDB backend.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
        <body className={`${playfair.variable} ${dmSans.variable} ${dmMono.variable} font-sans`}>
        {children}
        </body>
        </html>
    );
}
