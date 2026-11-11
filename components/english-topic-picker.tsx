"use client";
import { useState } from "react";
import { searchWritingTopics } from "@/lib/english/writing-topics";

export default function EnglishTopicPicker({
  grade,
  topics,
  title,
  value,
  onSelect,
}: {
  grade: number;
  topics: readonly string[];
  title: string;
  value: string;
  onSelect: (topic: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(6);
  const matches = searchWritingTopics(topics, query);
  if (!topics.length) return null;
  return (
    <details className="english-topic-library">
      <summary>
        <span>Browse reference topics</span>
        <small>
          {topics.length} topics · Class {grade}
        </small>
      </summary>
      <div className="english-topic-library-body">
        <label className="block">
          Search {title} topics
          <input
            type="search"
            value={query}
            placeholder="Search by title or keyword…"
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(6);
            }}
          />
        </label>
        <p className="english-topic-hint">
          বইয়ের সূচির topic suggestion। একটি বেছে নিন, অথবা উপরের ঘরে নিজের
          topic লিখুন।
        </p>
        <p className="english-topic-count" role="status" aria-live="polite">
          {matches.length} matching topics
        </p>
        <ul
          className="english-topic-results"
          aria-label={`${title} reference topics`}
        >
          {matches.slice(0, limit).map((topic) => (
            <li key={topic}>
              <button
                type="button"
                className={`english-topic-option${value === topic ? " is-picked" : ""}`}
                aria-pressed={value === topic}
                onClick={() => onSelect(topic)}
              >
                <span>{topic}</span>
                <span aria-hidden="true">{value === topic ? "✓" : "+"}</span>
              </button>
            </li>
          ))}
        </ul>
        {!matches.length && (
          <p className="english-topic-hint">
            মিল পাওয়া যায়নি। নিজের topic উপরের Requested topic ঘরে লিখতে পারবেন।
          </p>
        )}
        {matches.length > limit && (
          <button
            type="button"
            className="english-topic-more"
            onClick={() => setLimit((n) => n + 12)}
          >
            Show more topics ({matches.length - limit} remaining)
          </button>
        )}
      </div>
    </details>
  );
}
