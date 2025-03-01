import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';

export async function getHomepageContent() {
    const file = await fs.readFile(path.join(process.cwd(), 'content/homepage.md'), 'utf-8');
    const { data } = matter(file);
    return {
        title: data.title,
        subtitle: data.subtitle,
        ctaText: data.ctaText,
        ctaLink: data.ctaLink
    };
}