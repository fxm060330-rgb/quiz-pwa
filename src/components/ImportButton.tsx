"use client";

import { useState, useRef } from "react";
import { importQuestions } from "@/lib/db";
import type { Question } from "@/types";

interface Props {
  onImported: () => void;
}

export default function ImportButton({ onImported }: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processQuestions = async (questions: Question[], source: string) => {
    if (!Array.isArray(questions) || questions.length === 0) {
      setError("文件中没有有效的题目数据");
      return false;
    }
    setProgress(`正在导入 ${questions.length} 道题目...`);
    await importQuestions(questions);
    setProgress(`成功导入 ${questions.length} 道题目！（来源：${source}）`);
    setTimeout(onImported, 800);
    return true;
  };

  // Method 1: local JSON file
  const handleLocalFile = async () => {
    setLoading(true);
    setError("");
    setProgress("正在读取本地题库文件...");
    try {
      const res = await fetch("/data/questions.json");
      if (!res.ok) {
        setError("未找到本地题库文件 public/data/questions.json，请先放置文件或使用其他方式导入");
        setProgress("");
        setLoading(false);
        return;
      }
      const questions: Question[] = await res.json();
      await processQuestions(questions, "本地文件");
    } catch (e: unknown) {
      setError(`读取失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // Method 2: upload JSON file
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError("");
    setProgress("正在解析上传文件...");
    try {
      const text = await file.text();
      const questions: Question[] = JSON.parse(text);
      await processQuestions(questions, "上传文件");
    } catch (e: unknown) {
      setError(`解析失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Method 3: scrape from shititong.cn
  const handleScrape = async () => {
    setLoading(true);
    setError("");
    setProgress("正在抓取题库...");
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setLoading(false);
        return;
      }
      await processQuestions(data.questions, "在线抓取");
    } catch (e: unknown) {
      setError(`抓取失败: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="text-center">
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={handleLocalFile}
          disabled={loading}
          className="px-8 py-3 rounded-full bg-primary text-white font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 w-48"
        >
          {loading ? "导入中..." : "从本地文件导入"}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
          className="px-8 py-3 rounded-full border-2 border-primary text-primary font-semibold text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 w-48"
        >
          上传 JSON 文件
        </button>

        <button
          onClick={handleScrape}
          disabled={loading}
          className="px-8 py-3 rounded-full border border-gray-300 text-text-secondary text-xs transition-all duration-200 active:scale-95 disabled:opacity-50"
        >
          在线抓取（备用）
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {progress && <p className="mt-3 text-sm text-correct">{progress}</p>}
      {error && (
        <div className="mt-3 text-sm text-wrong">
          <p>{error}</p>
          <p className="mt-2 text-xs text-text-secondary">
            请确保 JSON 格式为：{" "}
            <code className="bg-gray-100 px-1 rounded">[{`{ id, type, question, options[], answer, analysis, chapter, difficulty }`}]</code>
          </p>
        </div>
      )}

      <p className="mt-4 text-xs text-text-secondary leading-relaxed">
        方式一：将题库文件放到{" "}
        <code className="bg-gray-100 px-1 rounded">public/data/questions.json</code>
        <br />
        方式二：直接上传 JSON 文件
      </p>
    </div>
  );
}
