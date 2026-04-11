"use client";

import { NotionBlock } from "@/app/types";

interface NotionContentProps {
  blocks: NotionBlock[];
}

export default function NotionContent({ blocks }: NotionContentProps) {
  if (blocks.length === 0) {
    return (
      <p className="text-gray-400 italic text-sm">
        Aucun contenu trouvé sur la page Notion.
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {blocks.map((block) => {
        if (!block.text.trim()) return null;

        if (block.type === "heading_1") {
          return (
            <h1 key={block.id} className="text-2xl font-bold text-gray-900 mt-4 mb-1">
              {block.text}
            </h1>
          );
        }
        if (block.type === "heading_2") {
          return (
            <h2 key={block.id} className="text-xl font-semibold text-gray-800 mt-3 mb-1">
              {block.text}
            </h2>
          );
        }
        if (block.type === "heading_3") {
          return (
            <h3 key={block.id} className="text-lg font-medium text-gray-700 mt-2 mb-1">
              {block.text}
            </h3>
          );
        }
        if (
          block.type === "bulleted_list_item" ||
          block.type === "numbered_list_item"
        ) {
          return (
            <li key={block.id} className="text-gray-700 ml-4 list-disc">
              {block.text}
            </li>
          );
        }
        if (block.type === "to_do") {
          return (
            <div key={block.id} className="flex items-center gap-2 text-gray-700">
              <span className="text-gray-400">☐</span>
              <span>{block.text}</span>
            </div>
          );
        }
        if (block.type === "quote") {
          return (
            <blockquote
              key={block.id}
              className="border-l-4 border-gray-200 pl-3 text-gray-600 italic"
            >
              {block.text}
            </blockquote>
          );
        }
        return (
          <p key={block.id} className="text-gray-700 leading-relaxed">
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
