/**
 * Comprehensive Language Detector Utility for Code Blocks
 */
export function detectCodeLanguage(code = '', hintLanguage = '') {
  if (hintLanguage && typeof hintLanguage === 'string') {
    const hint = hintLanguage.toLowerCase().trim();
    if (hint === 'c++' || hint === 'cpp') return 'C++';
    if (hint === 'c') return 'C';
    if (hint === 'rust' || hint === 'rs') return 'RUST';
    if (hint === 'python' || hint === 'py') return 'PYTHON';
    if (hint === 'javascript' || hint === 'js' || hint === 'node' || hint === 'jsx') return 'JAVASCRIPT';
    if (hint === 'typescript' || hint === 'ts' || hint === 'tsx') return 'TYPESCRIPT';
    if (hint === 'java') return 'JAVA';
    if (hint === 'go' || hint === 'golang') return 'GO';
    if (hint === 'c#' || hint === 'csharp' || hint === 'cs') return 'CSHARP';
    if (hint === 'php') return 'PHP';
    if (hint === 'sql') return 'SQL';
    if (hint === 'bash' || hint === 'sh' || hint === 'shell') return 'SHELL';
    if (hint === 'html' || hint === 'htm') return 'HTML';
    if (hint === 'css') return 'CSS';
    if (hint === 'json') return 'JSON';
  }

  const trimmed = (code || '').trim();

  // Rust patterns
  if (
    trimmed.includes('fn main') ||
    trimmed.includes('let mut ') ||
    trimmed.includes('println!') ||
    trimmed.includes('use std::') ||
    trimmed.includes('-> i32')
  ) {
    return 'RUST';
  }

  // Go patterns
  if (
    trimmed.includes('package main') ||
    trimmed.includes('func main()') ||
    trimmed.includes('fmt.Println') ||
    trimmed.includes('fmt.Printf')
  ) {
    return 'GO';
  }

  // Java patterns
  if (
    trimmed.includes('public class ') ||
    trimmed.includes('System.out.println') ||
    trimmed.includes('public static void main') ||
    trimmed.includes('Scanner scanner')
  ) {
    return 'JAVA';
  }

  // C# patterns
  if (
    trimmed.includes('using System;') ||
    trimmed.includes('Console.WriteLine') ||
    trimmed.includes('namespace ')
  ) {
    return 'CSHARP';
  }

  // PHP patterns
  if (trimmed.startsWith('<?php') || trimmed.includes('echo $') || trimmed.includes('function ')) {
    if (trimmed.includes('<?php') || trimmed.includes('$_GET') || trimmed.includes('$_POST')) {
      return 'PHP';
    }
  }

  // SQL patterns
  if (
    /^(SELECT|INSERT INTO|UPDATE|DELETE FROM|CREATE TABLE|ALTER TABLE|DROP TABLE)\b/i.test(trimmed)
  ) {
    return 'SQL';
  }

  // Bash / Shell patterns
  if (
    trimmed.startsWith('#!/bin/bash') ||
    trimmed.startsWith('#!/bin/sh') ||
    trimmed.includes('echo "') && (trimmed.includes('grep ') || trimmed.includes('chmod '))
  ) {
    return 'SHELL';
  }

  // C / C++ patterns
  if (
    trimmed.includes('#include <stdio.h>') ||
    trimmed.includes('#include <stdlib.h>') ||
    trimmed.includes('printf(') ||
    trimmed.includes('int main(') ||
    trimmed.includes('scanf(') ||
    trimmed.includes('<iostream>')
  ) {
    if (trimmed.includes('std::cout') || trimmed.includes('<iostream>') || trimmed.includes('std::endl')) {
      return 'C++';
    }
    return 'C';
  }

  // TypeScript patterns
  if (
    trimmed.includes(': string') ||
    trimmed.includes(': number') ||
    trimmed.includes(': boolean') ||
    trimmed.includes('interface ') ||
    trimmed.includes('type ') && trimmed.includes('= {')
  ) {
    return 'TYPESCRIPT';
  }

  // JavaScript patterns
  if (
    trimmed.includes('console.log(') ||
    trimmed.includes('document.getElementById') ||
    trimmed.includes('addEventListener') ||
    trimmed.includes('const ') ||
    trimmed.includes('let ') ||
    trimmed.includes('function ') ||
    trimmed.includes('=>')
  ) {
    return 'JAVASCRIPT';
  }

  // Python patterns
  if (
    trimmed.includes('def ') ||
    trimmed.includes('print(') ||
    trimmed.includes('import ') ||
    trimmed.includes('elif ') ||
    trimmed.includes('input(') ||
    trimmed.includes('range(') ||
    trimmed.includes('if __name__ == "__main__":')
  ) {
    return 'PYTHON';
  }

  // HTML
  if (trimmed.startsWith('<') && trimmed.includes('>')) {
    return 'HTML';
  }

  return 'CODE';
}
