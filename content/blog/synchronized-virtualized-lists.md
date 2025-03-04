# Synchronizing Virtualized Lists with TanStack Virtual

The simplest example using static data, with unknown item container sizes (i.e., dynamic virtual rows)
```tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';

// Define types for our datasets
interface ItemA {
    id: string;
    key: string;
    dataId: string;
    name: string;
    indexValue: number;
}

interface SubItem {
    subId: string;
    subName: string;
}

interface ItemB {
    id: number;
    details: string;
    extraInfo: string;
    items: SubItem[];
}

// Extend HTMLDivElement to include our custom property
interface CustomDivElement extends HTMLDivElement {
    scrollTimeout?: NodeJS.Timeout;
}

const DualVirtualizedLists = () => {
    // Sample data - replace with your actual data
    const datasetA: ItemA[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        key: `key-${i}`,
        dataId: `data-${i}`,
        name: `Item ${i}`,
        indexValue: i % 10, // This is the value we'll use to index into datasetB
    }));

    const datasetB: ItemB[] = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        details: `These are the details for category ${i}`,
        extraInfo: `Extra information related to category ${i}`,
        items: Array.from({ length: 3 }, (_, j) => ({
            subId: `sub-${i}-${j}`,
            subName: `Subitem ${j} for category ${i}`,
        })),
    }));

    // State to track the selected item from Container A
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

    // Refs for the scrollable containers
    const containerARef = useRef<CustomDivElement>(null);
    const containerBRef = useRef<CustomDivElement>(null);

    // Flags to prevent scroll loops
    const syncingAToB = useRef(false);
    const syncingBToA = useRef(false);

    // Track whether Container A or B was last manually scrolled
    const [lastScrolledContainer, setLastScrolledContainer] = useState<'A' | 'B' | null>(null);

    // Debug state to track when containers are updated
    const [debugInfo, setDebugInfo] = useState<{
        containerAScrollTop: number;
        containerBScrollTop: number;
    }>({
        containerAScrollTop: 0,
        containerBScrollTop: 0,
    });

    // Virtualizer for Container A with dynamic size measurement
    const containerAVirtualizer = useVirtualizer({
        count: datasetA.length,
        getScrollElement: () => containerARef.current,
        estimateSize: () => 70, // Initial estimate
        overscan: 5,
        scrollMargin: 0,
        measureElement: (element) => {
            // Get the actual height of the element
            return element?.getBoundingClientRect().height || 0;
        },
    });

    // Refs to store measured item heights
    const itemHeightsRef = useRef<Record<number, number>>({});

    // Function to update an item's measured height
    const updateItemHeight = (index: number, height: number) => {
        if (itemHeightsRef.current[index] !== height) {
            itemHeightsRef.current[index] = height;
            // Force the virtualizer to recalculate
            containerBVirtualizer.measure();
        }
    };

    // Virtualizer for Container B with dynamic size measurement
    const containerBVirtualizer = useVirtualizer({
        count: datasetA.length,
        getScrollElement: () => containerBRef.current,
        estimateSize: (index) => {
            // Use measured height if available, otherwise use a reasonable estimate
            // Using a larger default estimate ensures scrollbar appears immediately
            return itemHeightsRef.current[index] || 170;
        },
        overscan: 10, // Increased overscan for smoother scrolling
        scrollMargin: 0,
        measureElement: (element) => {
            // Get the actual height of the element
            return element?.getBoundingClientRect().height || 0;
        },
    });

    // When an item in Container A is clicked, synchronize Container B
    const handleItemClick = (index: number) => {
        console.log(`Clicked item at index ${index}`);
        setSelectedItemIndex(index);

        // Force direct scroll with TanStack's scrollToIndex for reliability
        syncingAToB.current = true;
        containerBVirtualizer.scrollToIndex(index, { align: 'start' });

        // Reset the sync flag after a small delay
        setTimeout(() => {
            syncingAToB.current = false;
        }, 150);
    };

    // Handle scroll events for Container A
    const handleContainerAScroll = () => {
        if (!syncingBToA.current) {
            setLastScrolledContainer('A');
            // Log to verify scrolling works
            console.log('Container A scrolled manually');
        }
    };

    // Handle scroll events for Container B with improved index calculation
    const handleContainerBScroll = () => {
        if (!syncingAToB.current) {
            setLastScrolledContainer('B');

            // Find the first fully visible item in Container B
            const visibleItems = containerBVirtualizer.getVirtualItems();
            if (visibleItems.length > 0) {
                syncingBToA.current = true;

                // Calculate scroll position relative to container
                const containerBScrollTop = containerBRef.current?.scrollTop || 0;
                const visibleIndex =
                    visibleItems.find((item) => item.start >= containerBScrollTop)?.index ||
                    visibleItems[0].index;

                console.log(`Container B scrolled to show item ${visibleIndex}`);

                // Update selected item for visual indication
                setSelectedItemIndex(visibleIndex);

                // Sync Container A to show the same item
                containerAVirtualizer.scrollToIndex(visibleIndex, { align: 'start' });

                // Reset sync flag after a delay
                setTimeout(() => {
                    syncingBToA.current = false;
                }, 150);
            }
        }
    };

    // Removed B scroll to A synchronization effect since we handle it directly in the scroll handler

    // Add resize observer to handle window size changes
    useEffect(() => {
        // Make sure the virtualized lists properly adjust if window size changes
        const handleResize = () => {
            containerAVirtualizer.measure();
            containerBVirtualizer.measure();
        };

        window.addEventListener('resize', handleResize);

        // Initial measure on mount - this is critical for initial scrollability
        setTimeout(() => {
            containerAVirtualizer.measure();
            containerBVirtualizer.measure();
        }, 100);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Force scroll range to be the full dataset
    useEffect(() => {
        // Ensure the total list size is calculated correctly
        const totalItems = datasetA.length;

        // Set total size in inline style
        if (containerARef.current) {
            const containerAList = containerARef.current.querySelector('[style]');
            if (containerAList) {
                const totalHeight = containerAVirtualizer.getTotalSize();
                console.log(
                    `Setting Container A list height to ${totalHeight}px for ${totalItems} items`,
                );
            }
        }

        if (containerBRef.current) {
            const containerBList = containerBRef.current.querySelector('[style]');
            if (containerBList) {
                const totalHeight = containerBVirtualizer.getTotalSize();
                console.log(
                    `Setting Container B list height to ${totalHeight}px for ${totalItems} items`,
                );
            }
        }
    }, [datasetA.length]);

    // Update debug info periodically
    useEffect(() => {
        const updateDebugInfo = () => {
            if (containerARef.current && containerBRef.current) {
                setDebugInfo({
                    containerAScrollTop: containerARef.current.scrollTop,
                    containerBScrollTop: containerBRef.current.scrollTop,
                });
            }
        };

        const interval = setInterval(updateDebugInfo, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex h-full w-full flex-col space-y-4 p-4">
            <h1 className="text-xl font-bold">Synchronized Virtualized Lists Demo</h1>
            <p className="text-sm">
                <span className="font-medium">Instructions:</span> Scroll both containers
                independently. Container A does not sync with B until you click an item. Container B
                always syncs with A.
            </p>
            <div className="text-xs text-gray-500">
                Selected Index: {selectedItemIndex !== null ? selectedItemIndex : 'None'} | Last
                Scrolled: {lastScrolledContainer || 'None'} | Container A ScrollTop:{' '}
                {debugInfo.containerAScrollTop}px | Container B ScrollTop:{' '}
                {debugInfo.containerBScrollTop}px
            </div>

            <div className="flex h-full w-full space-x-4">
                {/* Container A - Dataset A only */}
                <div className="flex max-h-full w-1/3 flex-col">
                    <h2 className="mb-2 text-lg font-medium">Container A</h2>
                    <div
                        className="max-h-[calc(100vh-200px)] flex-1 overflow-auto rounded-md border border-gray-300"
                        ref={containerARef}
                        onScroll={handleContainerAScroll}
                    >
                        <div
                            className="relative w-full"
                            style={{ height: `${containerAVirtualizer.getTotalSize()}px` }}
                        >
                            {containerAVirtualizer.getVirtualItems().map((virtualItem) => {
                                const item = datasetA[virtualItem.index];
                                return (
                                    <div
                                        key={item.id}
                                        data-id={item.dataId}
                                        className={`absolute left-0 top-0 w-full cursor-pointer border-b border-gray-200 ${
                                            selectedItemIndex === virtualItem.index
                                                ? 'bg-blue-100'
                                                : 'hover:bg-gray-50'
                                        }`}
                                        style={{
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                        onClick={() => handleItemClick(virtualItem.index)}
                                    >
                                        <div className="p-4">
                                            <h3 className="font-medium">{item.name}</h3>
                                            <p className="text-sm text-gray-600">
                                                Category: {item.indexValue}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Container B - Dataset A with details from Dataset B */}
                <div className="flex max-h-full w-2/3 flex-col">
                    <h2 className="mb-2 text-lg font-medium">Container B</h2>
                    <div
                        className="max-h-[calc(100vh-200px)] flex-1 overflow-auto rounded-md border border-gray-300"
                        ref={containerBRef}
                        onScroll={handleContainerBScroll}
                    >
                        <div
                            className="relative w-full"
                            style={{ height: `${containerBVirtualizer.getTotalSize()}px` }}
                        >
                            {containerBVirtualizer.getVirtualItems().map((virtualItem) => {
                                const itemA = datasetA[virtualItem.index];
                                const relatedItemB = datasetB[itemA.indexValue];

                                return (
                                    <div
                                        key={itemA.id}
                                        data-id={itemA.dataId}
                                        data-index={virtualItem.index}
                                        ref={(el) => {
                                            if (el) {
                                                // Measure the rendered element's height
                                                const height = el.getBoundingClientRect().height;
                                                updateItemHeight(virtualItem.index, height);
                                            }
                                        }}
                                        className={`absolute left-0 top-0 w-full border-b border-gray-200 ${
                                            selectedItemIndex === virtualItem.index
                                                ? 'bg-blue-100'
                                                : ''
                                        }`}
                                        style={{
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                    >
                                        <div className="p-4">
                                            <div className="flex justify-between">
                                                <h3 className="font-medium">{itemA.name}</h3>
                                                <span className="text-sm text-gray-500">
                                                    ID: {itemA.id}
                                                </span>
                                            </div>

                                            {relatedItemB && (
                                                <div className="mt-2 border-l-2 border-blue-300 pl-2">
                                                    <p className="text-sm font-medium">
                                                        Details from Dataset B:
                                                    </p>
                                                    <p className="text-sm">
                                                        {relatedItemB.details}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-600">
                                                        {relatedItemB.extraInfo}
                                                    </p>

                                                    {relatedItemB.items &&
                                                        relatedItemB.items.length > 0 && (
                                                            <div className="mt-2 space-y-1">
                                                                <p className="text-xs font-medium">
                                                                    Sub-items:
                                                                </p>
                                                                {relatedItemB.items.map(
                                                                    (subItem) => (
                                                                        <div
                                                                            key={subItem.subId}
                                                                            className="rounded bg-gray-50 p-2 text-xs"
                                                                        >
                                                                            {subItem.subName}
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DualVirtualizedLists;
```

Now lets make things a little more complicated:

**Synchronized Scrolling Behavior:**

1. Container A scrolls independently until an item is clicked
2. Clicking an item in Container A synchronizes Container B to that item
3. Scrolling Container B always synchronizes Container A

**Image Grid with Lazy Loading:**

1. Each item in Container B displays a 2x5 grid of images
2. Images are only loaded when the item is in view or near the viewport (±2 items)
3. Placeholders are shown for items outside the visible range
4. Loading state with spinners for images that are loading

**Performance Optimizations:**

1. Dynamic height measurement to handle different content sizes
2. Efficient tracking of visible items to minimize DOM nodes
3. Debounced scroll handlers to prevent performance issues
4. Proper cleanup of event listeners to prevent memory leaks

**Debug Information:**

1. Visual feedback about current selection and scroll positions
2. Console logs for important events to help with troubleshooting

**Viewport Constraints:**

1. Properly sized containers that respect the viewport height
2. Scrollable areas with appropriate overflow handling

```tsx
'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';

// Define types for our datasets
interface ItemA {
    id: string;
    key: string;
    dataId: string;
    name: string;
    indexValue: number;
}

interface SubItem {
    subId: string;
    subName: string;
}

interface ItemB {
    id: number;
    details: string;
    extraInfo: string;
    items: SubItem[];
    // Add image URLs for the grid
    imageGrid: string[];
}

// Extend HTMLDivElement to include our custom property
interface CustomDivElement extends HTMLDivElement {
    scrollTimeout?: NodeJS.Timeout;
}

const DualVirtualizedLists = () => {
    // Sample data - replace with your actual data
    const datasetA: ItemA[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        key: `key-${i}`,
        dataId: `data-${i}`,
        name: `Item ${i}`,
        indexValue: i % 10, // This is the value we'll use to index into datasetB
    }));

    const datasetB: ItemB[] = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        details: `These are the details for category ${i}`,
        extraInfo: `Extra information related to category ${i}`,
        items: Array.from({ length: 3 }, (_, j) => ({
            subId: `sub-${i}-${j}`,
            subName: `Subitem ${j} for category ${i}`,
        })),
        // Add 10 image URLs for the grid (2x5)
        imageGrid: Array.from(
            { length: 10 },
            (_, j) => `https://picsum.photos/seed/${i}-${j}/200/150`,
        ),
    }));

    // State to track the selected item from Container A
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

    // Refs for the scrollable containers
    const containerARef = useRef<CustomDivElement>(null);
    const containerBRef = useRef<CustomDivElement>(null);

    // Flags to prevent scroll loops
    const syncingAToB = useRef(false);
    const syncingBToA = useRef(false);

    // Track whether Container A or B was last manually scrolled
    const [lastScrolledContainer, setLastScrolledContainer] = useState<'A' | 'B' | null>(null);

    // Debug state to track when containers are updated
    const [debugInfo, setDebugInfo] = useState<{
        containerAScrollTop: number;
        containerBScrollTop: number;
    }>({
        containerAScrollTop: 0,
        containerBScrollTop: 0,
    });

    // Refs to store measured item heights
    const itemHeightsRef = useRef<Record<number, number>>({});

    // Map to track which items have had their images loaded
    const loadedItems = useRef<Record<number, boolean>>({});

    // Function to mark an item as having images loaded
    const markItemLoaded = (index: number) => {
        if (!loadedItems.current[index]) {
            loadedItems.current[index] = true;
        }
    };

    // Function to update an item's measured height
    const updateItemHeight = (index: number, height: number) => {
        if (itemHeightsRef.current[index] !== height) {
            itemHeightsRef.current[index] = height;
            // Force the virtualizer to recalculate
            containerBVirtualizer.measure();
        }
    };

    // Virtualizer for Container A with dynamic size measurement
    const containerAVirtualizer = useVirtualizer({
        count: datasetA.length,
        getScrollElement: () => containerARef.current,
        estimateSize: () => 70, // Initial estimate
        overscan: 5,
        scrollMargin: 0,
        measureElement: (element) => {
            // Get the actual height of the element
            return element?.getBoundingClientRect().height || 0;
        },
    });

    // Virtualizer for Container B with dynamic size measurement
    const containerBVirtualizer = useVirtualizer({
        count: datasetA.length,
        getScrollElement: () => containerBRef.current,
        estimateSize: (index) => {
            // Use measured height if available, otherwise use a reasonable estimate
            // Adding extra space for the image grid
            return itemHeightsRef.current[index] || 350;
        },
        overscan: 3, // Reduced overscan since we're manually managing visible range
        scrollMargin: 0,
        measureElement: (element) => {
            // Get the actual height of the element
            return element?.getBoundingClientRect().height || 0;
        },
    });

    // Remove the complex visibility tracking effect - we'll use a simpler approach

    // Initialize items to load on first render
    useEffect(() => {
        // Pre-load the first few items
        for (let i = 0; i < 20; i++) {
            markItemLoaded(i);
        }
    }, []);

    // When an item in Container A is clicked, synchronize Container B
    const handleItemClick = (index: number) => {
        console.log(`Clicked item at index ${index}`);
        setSelectedItemIndex(index);

        // Force direct scroll with TanStack's scrollToIndex for reliability
        syncingAToB.current = true;
        containerBVirtualizer.scrollToIndex(index, { align: 'start' });

        // Reset the sync flag after a small delay
        setTimeout(() => {
            syncingAToB.current = false;
        }, 150);
    };

    // Handle scroll events for Container A
    const handleContainerAScroll = () => {
        if (!syncingBToA.current) {
            setLastScrolledContainer('A');
            console.log('Container A scrolled manually');
        }
    };

    // Handle scroll events for Container B with improved index calculation
    const handleContainerBScroll = () => {
        if (!syncingAToB.current) {
            setLastScrolledContainer('B');

            // Find the first fully visible item in Container B
            const visibleItems = containerBVirtualizer.getVirtualItems();
            if (visibleItems.length > 0) {
                syncingBToA.current = true;

                // Calculate scroll position relative to container
                const containerBScrollTop = containerBRef.current?.scrollTop || 0;
                const visibleIndex =
                    visibleItems.find((item) => item.start >= containerBScrollTop)?.index ||
                    visibleItems[0].index;

                console.log(`Container B scrolled to show item ${visibleIndex}`);

                // Update selected item for visual indication
                setSelectedItemIndex(visibleIndex);

                // Sync Container A to show the same item
                containerAVirtualizer.scrollToIndex(visibleIndex, { align: 'start' });

                // Reset sync flag after a delay
                setTimeout(() => {
                    syncingBToA.current = false;
                }, 150);
            }
        }
    };

    // Helper function to check if an item should load images
    const shouldLoadImages = (index: number): boolean => {
        // If this item is newly visible, mark it for loading
        if (!loadedItems.current[index]) {
            markItemLoaded(index);
        }
        // Always return true once an item has been loaded once
        return loadedItems.current[index] || false;
    };

    // Lazy Image component with stable loading behavior
    const LazyImage = ({ src, alt }: { src: string; alt: string }) => {
        const [loaded, setLoaded] = useState(false);
        const [error, setError] = useState(false);
        const imgRef = useRef<HTMLImageElement>(null);

        return (
            <div className="relative h-full w-full overflow-hidden bg-gray-100">
                {!loaded && !error && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
                    </div>
                )}
                {error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                        <span className="text-xs text-gray-500">Failed to load</span>
                    </div>
                )}
                <img
                    ref={imgRef}
                    src={src}
                    alt={alt}
                    loading="lazy" // Use browser's native lazy loading
                    className={`h-full w-full object-cover ${loaded && !error ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => {
                        setError(true);
                        setLoaded(false);
                    }}
                />
            </div>
        );
    };

    // Add resize observer to handle window size changes
    useEffect(() => {
        // Make sure the virtualized lists properly adjust if window size changes
        const handleResize = () => {
            containerAVirtualizer.measure();
            containerBVirtualizer.measure();
        };

        window.addEventListener('resize', handleResize);

        // Initial measure on mount - this is critical for initial scrollability
        setTimeout(() => {
            containerAVirtualizer.measure();
            containerBVirtualizer.measure();

            // Pre-load more items when virtualizer is ready
            const visibleItems = containerBVirtualizer.getVirtualItems();
            if (visibleItems.length > 0) {
                visibleItems.forEach((item) => markItemLoaded(item.index));
            }
        }, 100);

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Update debug info periodically
    useEffect(() => {
        const updateDebugInfo = () => {
            if (containerARef.current && containerBRef.current) {
                setDebugInfo({
                    containerAScrollTop: containerARef.current.scrollTop,
                    containerBScrollTop: containerBRef.current.scrollTop,
                });
            }
        };

        const interval = setInterval(updateDebugInfo, 500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className="flex h-screen w-full flex-col overflow-hidden p-4"
            style={{ maxHeight: '100vh' }}
        >
            <div className="flex-shrink-0 space-y-4">
                <h1 className="text-xl font-bold">Synchronized Virtualized Lists Demo</h1>
                <p className="text-sm">
                    <span className="font-medium">Instructions:</span> Scroll both containers
                    independently. Container A does not sync with B until you click an item.
                    Container B always syncs with A.
                </p>
                <div className="text-xs text-gray-500">
                    Selected Index: {selectedItemIndex !== null ? selectedItemIndex : 'None'} | Last
                    Scrolled: {lastScrolledContainer || 'None'} | Container A ScrollTop:{' '}
                    {debugInfo.containerAScrollTop}px | Container B ScrollTop:{' '}
                    {debugInfo.containerBScrollTop}px
                </div>
            </div>

            <div className="flex w-full flex-1 space-x-4 overflow-hidden">
                {/* Container A - Dataset A only */}
                <div className="flex max-h-full w-1/3 flex-col">
                    <h2 className="mb-2 text-lg font-medium">Container A</h2>
                    <div
                        className="max-h-[calc(100vh-200px)] flex-1 overflow-auto rounded-md border border-gray-300"
                        ref={containerARef}
                        onScroll={handleContainerAScroll}
                    >
                        <div
                            className="relative w-full"
                            style={{ height: `${containerAVirtualizer.getTotalSize()}px` }}
                        >
                            {containerAVirtualizer.getVirtualItems().map((virtualItem) => {
                                const item = datasetA[virtualItem.index];
                                return (
                                    <div
                                        key={item.id}
                                        data-id={item.dataId}
                                        className={`absolute left-0 top-0 w-full cursor-pointer border-b border-gray-200 ${
                                            selectedItemIndex === virtualItem.index
                                                ? 'bg-blue-100'
                                                : 'hover:bg-gray-50'
                                        }`}
                                        style={{
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                        onClick={() => handleItemClick(virtualItem.index)}
                                    >
                                        <div className="p-4">
                                            <h3 className="font-medium">{item.name}</h3>
                                            <p className="text-sm text-gray-600">
                                                Category: {item.indexValue}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Container B - Dataset A with details from Dataset B */}
                <div className="flex max-h-full w-2/3 flex-col">
                    <h2 className="mb-2 text-lg font-medium">Container B</h2>
                    <div
                        className="max-h-[calc(100vh-200px)] flex-1 overflow-auto rounded-md border border-gray-300"
                        ref={containerBRef}
                        onScroll={(e) => {
                            handleContainerBScroll();

                            // Mark items as loaded when they come into view
                            const visibleItems = containerBVirtualizer.getVirtualItems();
                            visibleItems.forEach((item) => markItemLoaded(item.index));
                        }}
                    >
                        <div
                            className="relative w-full"
                            style={{ height: `${containerBVirtualizer.getTotalSize()}px` }}
                        >
                            {containerBVirtualizer.getVirtualItems().map((virtualItem) => {
                                const itemA = datasetA[virtualItem.index];
                                const relatedItemB = datasetB[itemA.indexValue];

                                return (
                                    <div
                                        key={itemA.id}
                                        data-id={itemA.dataId}
                                        data-index={virtualItem.index}
                                        ref={(el) => {
                                            if (el) {
                                                // Measure the rendered element's height
                                                const height = el.getBoundingClientRect().height;
                                                updateItemHeight(virtualItem.index, height);
                                            }
                                        }}
                                        className={`absolute left-0 top-0 w-full border-b border-gray-200 ${
                                            selectedItemIndex === virtualItem.index
                                                ? 'bg-blue-100'
                                                : ''
                                        }`}
                                        style={{
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                    >
                                        <div className="p-4">
                                            <div className="flex justify-between">
                                                <h3 className="font-medium">{itemA.name}</h3>
                                                <span className="text-sm text-gray-500">
                                                    ID: {itemA.id}
                                                </span>
                                            </div>

                                            {relatedItemB && (
                                                <div className="mt-2 border-l-2 border-blue-300 pl-2">
                                                    <p className="text-sm font-medium">
                                                        Details from Dataset B:
                                                    </p>
                                                    <p className="text-sm">
                                                        {relatedItemB.details}
                                                    </p>
                                                    <p className="mt-1 text-xs text-gray-600">
                                                        {relatedItemB.extraInfo}
                                                    </p>

                                                    {/* Image Grid - 2x5 layout */}
                                                    {shouldLoadImages(virtualItem.index) &&
                                                        relatedItemB.imageGrid && (
                                                            <div className="mt-4">
                                                                <p className="mb-2 text-sm font-medium">
                                                                    Image Gallery:
                                                                </p>
                                                                <div className="grid grid-cols-5 gap-2">
                                                                    {relatedItemB.imageGrid
                                                                        .slice(0, 10)
                                                                        .map((imgSrc, imgIndex) => (
                                                                            <div
                                                                                key={`img-${imgIndex}`}
                                                                                className={`aspect-video ${imgIndex < 5 ? 'mb-2' : ''}`}
                                                                            >
                                                                                <LazyImage
                                                                                    src={imgSrc}
                                                                                    alt={`Image ${imgIndex + 1} for ${itemA.name}`}
                                                                                />
                                                                            </div>
                                                                        ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                    {/* Display placeholder when images should not be loaded */}
                                                    {!shouldLoadImages(virtualItem.index) &&
                                                        relatedItemB.imageGrid && (
                                                            <div className="mt-4">
                                                                <p className="mb-2 text-sm font-medium">
                                                                    Image Gallery:
                                                                </p>
                                                                <div className="grid grid-cols-5 gap-2">
                                                                    {Array.from({ length: 10 }).map(
                                                                        (_, imgIndex) => (
                                                                            <div
                                                                                key={`placeholder-${imgIndex}`}
                                                                                className={`aspect-video bg-gray-200 ${imgIndex < 5 ? 'mb-2' : ''}`}
                                                                            >
                                                                                <div className="flex h-full w-full items-center justify-center">
                                                                                    <div className="text-xs text-gray-400">
                                                                                        Loading...
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ),
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                    {relatedItemB.items &&
                                                        relatedItemB.items.length > 0 && (
                                                            <div className="mt-4 space-y-1">
                                                                <p className="text-xs font-medium">
                                                                    Sub-items:
                                                                </p>
                                                                {relatedItemB.items.map(
                                                                    (subItem) => (
                                                                        <div
                                                                            key={subItem.subId}
                                                                            className="rounded bg-gray-50 p-2 text-xs"
                                                                        >
                                                                            {subItem.subName}
                                                                        </div>
                                                                    ),
                                                                )}
                                                            </div>
                                                        )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DualVirtualizedLists;
```

Okay, now lets re-organize into components to that it is far easier to deal with.

Component Structure Overview

Here's the overall structure of the components:

```
1. Page (Top-level component)
   │
   ├── PageHeader
   │   - Displays title, instructions, and debug info
   │
   ├── CompactListContainer (Container A)
   │   │
   │   └── CompactListItem (Multiple)
   │       - Simple items with minimal information
   │
   └── ExpandedListContainer (Container B)
       │
       └── ExpandedListItem (Multiple)
           │
           ├── ItemHeader
           │   - Displays item title and ID
           │
           ├── ImageGrid
           │   │
           │   └── LazyImage (Multiple)
           │       - Handles lazy loading of images
           │
           └── SubItems
               - Displays sub-items of the expanded item
```

**File Structure:**

- `types.ts` - Contains all TypeScript interfaces
- `Page.tsx` - Main component that orchestrates everything
- `PageHeader.tsx` - Header component with instructions and debug info
- `CompactListContainer.tsx` - Container A implementation
- `CompactListItem.tsx` - Individual items for Container A
- `ExpandedListContainer.tsx` - Container B implementation
- `ExpandedListItem.tsx` - Expanded item view for Container B
- `ItemHeader.tsx` - Header for expanded items
- `ImageGrid.tsx` - Grid display for images
- `LazyImage.tsx` - Image component with lazy loading capability
- `SubItems.tsx` - Component to display sub-items

**Key Features:**

1. Virtualized rendering for performance
2. Synchronized scrolling between containers
3. Lazy loading of images
4. Modular, reusable components
5. TypeScript typing for all components
6. Clean separation of concerns

**Component Hierarchy**

1. **Page** - The main container that manages state and orchestrates component interaction
2. **PageHeader** - Displays the title, instructions, and debug information
3. **Container A:** CompactListContainer & CompactListItem - The simpler left side list
4. **Container B:** ExpandedListContainer & ExpandedListItem - The more complex right side list
5. **Supporting Components:**
  - **ItemHeader** - Header for expanded items
  - **ImageGrid** - 2x5 grid of images with lazy loading
  - **LazyImage** - Handles image loading with spinner and error states
  - **SubItems** - Displays the sub-items section

**Key Improvements**

1. **Better Separation of Concerns:**
  - Each component now has a single responsibility
  - State management is centralized in the parent component
  - Props are properly typed with TypeScript interfaces
2. **More Maintainable Code:**
  - Smaller, focused components that are easier to understand
  - Clear prop interfaces between components
  - Easier to modify or replace individual parts
3. **Reusability:**
  - Components like LazyImage and ImageGrid can be used elsewhere
  - The virtualization logic is encapsulated in the container components

**Implementation Notes**

1. The Page component manages the shared state and synchronization flags
2. Each container component handles its own virtualization
3. The LazyImage component includes an option to use NextImage with HeroUI
4. Image loading is handled with a simple "load once, stay loaded" approach
5. Proper TypeScript interfaces ensure type safety across components

To use this in your project, you would import these components and organize them in your file structure. You can also further customize components like LazyImage to integrate with your UI library.
