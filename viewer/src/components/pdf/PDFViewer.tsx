"use client";

import { useState, useRef, useCallback } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { defaultLayoutPlugin } from "@react-pdf-viewer/default-layout";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/default-layout/lib/styles/index.css";

import ChatPane from "../chat/ChatPane"; 

export interface Block {
  id: string;
  type: string;
  block_type: string;
  html: string;
  polygon: number[][];
  page_number?: number;
  pageIndex?: number;
  children?: Block[];
}

// A minimal Block Info component (for the built-in sidebar tab, if you still want it)
function BlockInformation({ block }: { block: Block | null }) {
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
          <p>
            <span className="font-medium">ID:</span> {block.id}
          </p>
          <p>
            <span className="font-medium">Type:</span> {block.block_type}
          </p>
          <p>
            <span className="font-medium">Content:</span>
          </p>
          <div
            className="mt-1 p-2 bg-gray-50 rounded text-sm"
            dangerouslySetInnerHTML={{ __html: block.html }}
          />
        </div>
      </div>
    </div>
  );
}

export default function PDFViewer() {
  const [pdfFile, setPdfFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Flattened blocks array
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<Block | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultLayoutPluginInstance = defaultLayoutPlugin({
    sidebarTabs: (defaultTabs) => [
      ...defaultTabs,
      {
        content: <BlockInformation block={selectedBlock} />,
        icon: (
          <svg viewBox="0 0 24 24" width="24px" height="24px">
            <path
              d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"
              fill="currentColor"
            />
          </svg>
        ),
        title: "Block Information",
      },
    ],
  });

  // Example flattening function
  const parseBlock = (block: Block, nextPageIndex: number, all: Block[]): number => {
    if (block.block_type === "Page") {
      if (typeof block.page_number === "number") {
        block.pageIndex = block.page_number - 1;
        if (block.pageIndex >= nextPageIndex) {
          nextPageIndex = block.pageIndex + 1;
        }
      } else {
        block.pageIndex = nextPageIndex;
        nextPageIndex++;
      }
    } else {
      if (typeof block.pageIndex !== "number") {
        block.pageIndex = 0;
      }
    }
    all.push(block);
    if (block.children) {
      for (const child of block.children) {
        child.pageIndex = block.pageIndex;
        nextPageIndex = parseBlock(child, nextPageIndex, all);
      }
    }
    return nextPageIndex;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("http://localhost:8000/api/process-pdf", {
          method: "POST",
          body: formData,
        });
        const data = await response.json();

        let allBlocks: Block[] = [];
        if (data.blocks && data.blocks.children) {
          let nextPageIndex = 0;
          for (const topBlock of data.blocks.children) {
            nextPageIndex = parseBlock(topBlock, nextPageIndex, allBlocks);
          }
        }
        setBlocks(allBlocks);
        setPdfFile(base64);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error processing PDF:", error);
    }
    setLoading(false);
  };

  const handleBlockClick = useCallback((block: Block) => {
    setSelectedBlock(block);
  }, []);

  const renderOverlay = useCallback(
    (props: { pageIndex: number; scale: number; rotation: number }) => {
      const { scale, pageIndex } = props;
      return (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          {blocks
            .filter(
              (b) =>
                b.block_type !== "Page" && (b.pageIndex ?? 0) === pageIndex
            )
            .map((b) => {
              if (!b.polygon || b.polygon.length < 4) return null;
              const x = Math.min(...b.polygon.map((p) => p[0]));
              const y = Math.min(...b.polygon.map((p) => p[1]));
              const w = Math.max(...b.polygon.map((p) => p[0])) - x;
              const h = Math.max(...b.polygon.map((p) => p[1])) - y;

              const isSelected = selectedBlock?.id === b.id;
              const isTextType = b.block_type.toLowerCase() === "text";

              const style = {
                position: "absolute" as const,
                left: `${x * scale}px`,
                top: `${y * scale}px`,
                width: `${w * scale}px`,
                height: `${h * scale}px`,
                backgroundColor: "transparent",
                border: `1px solid ${isTextType ? "rgba(0, 0, 255, 0.6)" : "transparent"}`,
                cursor: "pointer",
                transition: "all 0.2s ease-in-out",
                zIndex: isSelected ? 2 : 1,
              };
              return (
                <div
                  key={b.id}
                  style={style}
                  className="hover:border-blue-800"
                  onClick={() => handleBlockClick(b)}
                  title={b.html?.replace(/<[^>]*>/g, "") || ""}
                />
              );
            })}
        </div>
      );
    },
    [blocks, selectedBlock, handleBlockClick]
  );

  const textBlockTypes = ["text"];
  const isTextBlock = selectedBlock?.block_type && textBlockTypes.includes(selectedBlock.block_type.toLowerCase());

  return (
    <div className="flex h-screen">
      {/* Left side: PDF viewer */}
      <div className="flex-1 relative">
        {!pdfFile ? (
          <div className="flex h-full items-center justify-center">
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
              {loading ? "Processing..." : "Upload PDF"}
            </button>
          </div>
        ) : (
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
        )}
      </div>

      {/* Right side: Chat pane for text blocks */}
      {selectedBlock && isTextBlock && (
        <ChatPane
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
        />
      )}
    </div>
  );
}
