'use client';

import { useState, useRef, useCallback } from 'react';
import { Worker, Viewer } from '@react-pdf-viewer/core';
import { defaultLayoutPlugin } from '@react-pdf-viewer/default-layout';
import type { LayoutPlugin } from '@react-pdf-viewer/default-layout';

// Import styles
import '@react-pdf-viewer/core/lib/styles/index.css';
import '@react-pdf-viewer/default-layout/lib/styles/index.css';

interface Block {
  id: string;
  type: string;
  block_type: string;
  html: string;
  polygon: number[][];
  children?: Block[];
}

// Block Information Component
const BlockInformation = ({ block }: { block: Block | null }) => {
  if (!block) {
    return (
      <div className="p-4 text-gray-500">
        Select a block to view its information
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h3 className="font-semibold mb-2">Basic Information</h3>
        <div className="space-y-1">
          <p><span className="font-medium">ID:</span> {block.id}</p>
          <p><span className="font-medium">Type:</span> {block.block_type}</p>
          <p><span className="font-medium">Content:</span></p>
          <div className="mt-1 p-2 bg-gray-50 rounded text-sm" dangerouslySetInnerHTML={{ __html: block.html }} />
        </div>
      </div>
    </div>
  );
};

export default function PDFViewer() {
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create new plugin instance with custom sidebar tab
  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      ...defaultTabs,
      {
        content: <BlockInformation block={selectedBlock} />,
        icon: (
          <svg viewBox="0 0 24 24" width="24px" height="24px">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z" fill="currentColor"/>
          </svg>
        ),
        title: 'Block Information',
      },
    ],
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      // First convert the file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        
        // Send to backend for processing
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:8000/api/process-pdf', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        
        // Store the blocks from the Marker API response
        if (data.blocks && data.blocks.children) {
          const allBlocks: Block[] = [];
          const extractBlocks = (block: Block) => {
            allBlocks.push(block);
            if (block.children) {
              block.children.forEach(extractBlocks);
            }
          };
          data.blocks.children.forEach(extractBlocks);
          setBlocks(allBlocks);
        }

        // Set the PDF file for viewing
        setPdfFile(base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing PDF:', error);
    }
    setLoading(false);
  };

  const handleBlockClick = useCallback((block: Block) => {
    setSelectedBlock(block);
  }, []);

  const renderOverlay = useCallback((props: any) => {
    const { scale } = props;
    
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {blocks.map((block) => {
          // Skip Page blocks and blocks without polygons
          if (block.block_type === 'Page' || !block.polygon || block.polygon.length < 4) return null;
          
          // Calculate bounds from polygon
          const x = Math.min(...block.polygon.map(p => p[0]));
          const y = Math.min(...block.polygon.map(p => p[1]));
          const width = Math.max(...block.polygon.map(p => p[0])) - x;
          const height = Math.max(...block.polygon.map(p => p[1])) - y;
          
          const isSelected = selectedBlock?.id === block.id;
          
          const style = {
            position: 'absolute' as const,
            left: `${x * scale}px`,
            top: `${y * scale}px`,
            width: `${width * scale}px`,
            height: `${height * scale}px`,
            backgroundColor: 'transparent', // Fully transparent background
            border: isSelected
              ? '2px solid rgba(0, 120, 255, 0.8)'
              : '1px solid rgba(0, 0, 255, 0.6)',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            zIndex: isSelected ? 2 : 1,
          };

          return (
            <div
              key={block.id}
              style={style}
              className="hover:border-blue-800"
              onClick={() => handleBlockClick(block)}
              title={block.html?.replace(/<[^>]*>/g, '') || ''}
            />
          );
        })}
      </div>
    );
  }, [blocks, selectedBlock, handleBlockClick]);

  return (
    <div className="h-screen flex flex-col">
      {!pdfFile ? (
        <div className="flex-1 flex items-center justify-center">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Upload PDF'}
          </button>
        </div>
      ) : (
        <div className="flex-1 relative">
          <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js">
            <Viewer
              fileUrl={pdfFile}
              plugins={[defaultLayoutPluginInstance]}
              renderPage={(props) => (
                <>
                  {props.canvasLayer.children}
                  {props.textLayer.children}
                  {renderOverlay(props)}
                </>
              )}
            />
          </Worker>
        </div>
      )}
    </div>
  );
}
