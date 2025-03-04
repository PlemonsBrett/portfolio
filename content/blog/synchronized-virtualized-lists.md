# Synchronizing Virtualized Lists with TanStack Virtual

The simplest example using static data, with unknown item container sizes (i.e., dynamic virtual rows)
```ts
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
