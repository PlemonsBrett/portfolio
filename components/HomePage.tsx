'use client';

import { Button, Link } from '@heroui/react';
import { ArrowRight } from 'lucide-react';

interface HomePageProps {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
}

export default function HomePage({ title, subtitle, ctaText, ctaLink }: HomePageProps) {
  return (
    <section className="text-center space-y-6 py-12">
      <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
        {title}
      </h1>
      <p className="text-lg text-gray-600 dark:text-gray-300">
        {subtitle}
      </p>
      <Link href={ctaLink}>
        <Button size="lg" className="mt-4">
          {ctaText}
          <ArrowRight className="ml-2" />
        </Button>
      </Link>
    </section>
  );
} 