'use client';

import { useState, useEffect } from 'react';
import { cn, Link } from '@heroui/react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Sun, Menu, X } from 'lucide-react';

const NavLink = ({ href, children, mobile = false }: { href: string, children: React.ReactNode, mobile?: boolean }) => {
    const pathname = usePathname();
    const isActive = pathname === href;

    return (
        <Link
            href={href}
            className={cn(
                isActive
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400',
                mobile ? 'text-lg py-2' : 'px-4 py-2',
                'transition-colors'
            )}
        >
            {children}
        </Link>
    )
}

export default function Navbar() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    // Prevent hydration mismatch by not rendering theme-dependent elements until mounted
    const ThemeToggle = () => {
        if (!mounted) return null;
        
        return (
            <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className='ml-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors'
                aria-label='Toggle Theme'
            >
                {theme === 'dark' ? (
                    <Sun className='h-5 w-5 text-yellow-500' />
                ) : (
                    <Moon className='h-5 w-5 text-gray-700' />
                )}
            </button>
        );
    };

    return (
        <header
            className={cn(
                'sticky top-0 z-50 transition-all duration-300',
                isScrolled
                    ? 'bg-white dark:bg-gray-900 shadow-md py-3'
                    : 'bg-transparent py-5',
            )}
        >
            <div className="container mx-auto px-4">
                <div className="flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/" className="text-2xl font-bold text-blue-600 dark:text-white">
                        BP<span className="text-gray-900 dark:text-blue-400">.dev</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center space-x-1">
                        <NavLink href="/">Home</NavLink>
                        <NavLink href="/about">About</NavLink>
                        <NavLink href="/experience">Experience</NavLink>
                        <NavLink href="/projects">Projects</NavLink>
                        <NavLink href="/blog">Blog</NavLink>
                        <NavLink href="/contact">Contact</NavLink>
                        <ThemeToggle />
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                    >
                        {isMobileMenuOpen ? (
                            <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                        ) : (
                            <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Navigation */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 pt-20">
                    <nav className="container mx-auto px-4 flex flex-col">
                        <NavLink href="/" mobile>Home</NavLink>
                        <NavLink href="/about" mobile>About</NavLink>
                        <NavLink href="/experience" mobile>Experience</NavLink>
                        <NavLink href="/projects" mobile>Projects</NavLink>
                        <NavLink href="/blog" mobile>Blog</NavLink>
                        <NavLink href="/contact" mobile>Contact</NavLink>

                        {mounted && (
                            <div className="mt-6 flex items-center">
                                <span className="text-gray-600 dark:text-gray-400 mr-3">
                                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                </span>
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    aria-label="Toggle theme"
                                >
                                    {theme === 'dark' ? (
                                        <Sun className="h-5 w-5 text-yellow-400" />
                                    ) : (
                                        <Moon className="h-5 w-5 text-gray-700" />
                                    )}
                                </button>
                            </div>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}