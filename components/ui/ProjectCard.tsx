'use client';

import React from 'react';

interface ProjectCardProps {
  title: string;
  description: string;
  link?: string;
  technologies?: string[];
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  link,
  technologies = [],
}) => {
  return (
    <div className="p-6 rounded-lg border border-gray-200 dark:border-gray-800">
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 dark:text-gray-300 mb-4">{description}</p>
      {technologies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {technologies.map((tech) => (
            <span
              key={tech}
              className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-800 rounded"
            >
              {tech}
            </span>
          ))}
        </div>
      )}
      {link && (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          View Project →
        </a>
      )}
    </div>
  );
};
