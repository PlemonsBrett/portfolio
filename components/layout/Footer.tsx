'use client';

import { Link } from "@heroui/react";
import { Mail } from 'lucide-react';
import { LinkedInIcon, GithubIcon } from "../icons";
import { siteConfig } from "@/config/site";

export default function Footer() {
    return (
        <footer className="w-full py-6 border-t border-gray-300 dark:border-gray-700 text-center">
            <div className="container mx-auto flex flex-col items-center space-y-4">
                {/* Social Links */}
                <div className="flex space-x-4">
                    <Link href={siteConfig.links.github} target="_blank" aria-label="GitHub">
                        <GithubIcon className="w-6 h-6" />
                    </Link>
                    <Link href={siteConfig.links.linkedin} target="_blank" aria-label="LinkedIn">
                        <LinkedInIcon className="w-6 h-6" />
                    </Link>
                    <Link href={siteConfig.links.email} target="_blank" aria-label="Email">
                        <Mail className="w-6 h-6 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white" />
                    </Link>
                </div>

                {/* Footer Navigation */}
                <nav className="flex space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    {siteConfig.navItems.map((item) => (
                        <Link key={item.href} href={item.href} className="hover:text-gray-700 dark:hover:text-white">
                            {item.label}
                        </Link>
                    ))}
                </nav>

                {/* Copyright */}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    © {new Date().getFullYear()} Brett Plemons. All rights reserved.
                </p>
            </div>
        </footer>
    )
}
