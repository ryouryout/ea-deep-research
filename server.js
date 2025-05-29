const express = require('express');
const WebSocket = require('ws');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// API Keys from environment variables
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const GOOGLE_CX = process.env.GOOGLE_CX;
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

// Initialize Anthropic client
const anthropic = new Anthropic({
    apiKey: CLAUDE_API_KEY,
});

app.use(express.static('.'));
app.use(express.json());

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('新しいWebSocket接続が確立されました');

    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'analyze') {
                const companyName = data.companyName;
                console.log(`分析開始: ${companyName}`);
                
                // 分析プロセスを開始
                await performDeepAnalysis(ws, companyName);
            }
        } catch (error) {
            console.error('エラー:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: 'エラーが発生しました: ' + error.message
            }));
        }
    });

    ws.on('close', () => {
        console.log('WebSocket接続が切断されました');
    });
});

// 深層分析を実行する関数
async function performDeepAnalysis(ws, companyName) {
    try {
        // ステップ1: Google検索で基本情報を収集
        ws.send(JSON.stringify({
            type: 'status',
            step: 1,
            message: `${companyName}の基本情報を収集中...`,
            progress: 10
        }));

        const searchResults = await googleSearch(companyName);
        
        ws.send(JSON.stringify({
            type: 'status',
            step: 1,
            message: `Google検索で${searchResults.length}件の情報を取得しました`,
            progress: 25
        }));

        // ステップ2: Claude AIで初回分析
        ws.send(JSON.stringify({
            type: 'status',
            step: 2,
            message: 'AI分析を開始しています...',
            progress: 30
        }));

        let analysisDepth = 0;
        let analysisData = {
            company: companyName,
            searchResults: searchResults,
            insights: [],
            needsDeepening: true
        };

        // 3段階以上の深層分析ループ
        while (analysisDepth < 3 || (analysisData.needsDeepening && analysisDepth < 5)) {
            analysisDepth++;
            
            ws.send(JSON.stringify({
                type: 'status',
                step: analysisDepth === 1 ? 2 : 3,
                message: `第${analysisDepth}段階の分析を実行中...`,
                progress: 30 + (analysisDepth * 15)
            }));

            // Claude APIで分析
            const analysis = await analyzeWithClaude(analysisData, analysisDepth);
            
            // 分析結果をanalysisDataに統合
            analysisData.insights = [...analysisData.insights, ...analysis.insights];
            analysisData.needsDeepening = analysis.needsDeepening;

            // 追加検索が必要な場合
            if (analysis.additionalSearchTerms && analysis.additionalSearchTerms.length > 0) {
                ws.send(JSON.stringify({
                    type: 'status',
                    step: 3,
                    message: `追加情報を検索中: ${analysis.additionalSearchTerms.join(', ')}`,
                    progress: 30 + (analysisDepth * 15) + 5
                }));

                for (const term of analysis.additionalSearchTerms) {
                    const additionalResults = await googleSearch(`${companyName} ${term}`);
                    if (additionalResults && additionalResults.length > 0) {
                        analysisData.searchResults = [...analysisData.searchResults, ...additionalResults];
                    }
                }
            }

            // 中間結果を送信
            ws.send(JSON.stringify({
                type: 'intermediate',
                depth: analysisDepth,
                insights: analysis.insights
            }));
        }

        // ステップ4: 提案スライド作成
        ws.send(JSON.stringify({
            type: 'status',
            step: 4,
            message: '提案スライドを生成中...',
            progress: 85
        }));

        const slides = await generateProposalSlides(analysisData);

        // 最終結果を送信
        ws.send(JSON.stringify({
            type: 'complete',
            slides: slides,
            totalDepth: analysisDepth,
            progress: 100
        }));

    } catch (error) {
        console.error('分析エラー:', error);
        ws.send(JSON.stringify({
            type: 'error',
            message: `分析中にエラーが発生しました: ${error.message}`
        }));
    }
}

// Google検索API
async function googleSearch(query) {
    try {
        const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
            params: {
                key: GOOGLE_API_KEY,
                cx: GOOGLE_CX,
                q: query,
                num: 10,
                hl: 'ja'
            }
        });

        return response.data.items ? response.data.items.map(item => ({
            title: item.title,
            link: item.link,
            snippet: item.snippet,
            displayLink: item.displayLink
        })) : [];
    } catch (error) {
        console.error('Google検索エラー:', error);
        return [];
    }
}

// Claude APIで分析
async function analyzeWithClaude(data, depth) {
    try {
        const prompt = `
あなたは企業分析の専門家です。以下の情報を基に、${data.company}について深い分析を行ってください。
現在、第${depth}段階の分析です。

これまでの検索結果:
${JSON.stringify(data.searchResults, null, 2)}

${data.insights.length > 0 ? `これまでの分析結果:\n${JSON.stringify(data.insights, null, 2)}` : ''}

以下の観点から分析してください：
1. 企業の概要、事業内容、強み
2. 業界での位置づけ、競合状況
3. 財務状況、成長性
4. 技術力、イノベーション
5. 経営戦略、将来性
6. 課題、リスク要因

出力形式（JSONで返してください）:
{
  "insights": [
    {
      "category": "カテゴリ名",
      "findings": "発見した内容",
      "importance": "high/medium/low"
    }
  ],
  "additionalSearchTerms": ["さらに検索すべきキーワード"],
  "needsDeepening": true/false,
  "summary": "現時点での総括"
}
`;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 4000,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const content = response.content[0].text;
        
        // JSONパースを試みる
        try {
            // JSONブロックを抽出（```jsonで囲まれている場合）
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[1]);
            }
            // 直接JSONの場合
            return JSON.parse(content);
        } catch (e) {
            console.log('JSON解析エラー。デフォルト構造を返します:', e.message);
            // JSONパースに失敗した場合は、基本的な構造を返す
            return {
                insights: [{
                    category: "分析結果",
                    findings: content,
                    importance: "high"
                }],
                additionalSearchTerms: [],
                needsDeepening: depth < 3,
                summary: content.substring(0, 200) + "..."
            };
        }
    } catch (error) {
        console.error('Claude API エラー:', error);
        throw error;
    }
}

// 提案スライド生成
async function generateProposalSlides(analysisData) {
    try {
        const prompt = `
以下の分析結果を基に、${analysisData.company}に関する提案スライドの骨子を作成してください。
各スライドは、コピペ可能な形式で、構造化された内容にしてください。

分析結果:
${JSON.stringify(analysisData.insights, null, 2)}

以下の構成でスライドを作成してください：
1. 表紙（タイトル、サブタイトル、日付）
2. エグゼクティブサマリー（3-5つの重要ポイント）
3. 企業概要と現状分析
4. 市場環境と競合分析
5. 強みと機会
6. 課題とリスク
7. 提案する戦略
8. 実行計画とロードマップ
9. 期待される成果
10. まとめと次のステップ

各スライドはJSON形式で以下の構造にしてください：
{
  "slides": [
    {
      "slideNumber": 1,
      "title": "スライドタイトル",
      "content": {
        "main": "メインコンテンツ",
        "bullets": ["箇条書き項目1", "箇条書き項目2"],
        "notes": "スピーカーノート"
      }
    }
  ]
}
`;

        const response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 8000,
            messages: [{
                role: 'user',
                content: prompt
            }]
        });

        const content = response.content[0].text;
        
        try {
            // JSONブロックを抽出（```jsonで囲まれている場合）
            const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[1]);
                return parsed.slides || parsed;
            }
            // 直接JSONの場合
            const parsed = JSON.parse(content);
            return parsed.slides || parsed;
        } catch (e) {
            console.log('スライドJSON解析エラー。デフォルト構造を返します:', e.message);
            // パースエラーの場合はシンプルな形式で返す
            return [{
                slideNumber: 1,
                title: "分析結果",
                content: {
                    main: content.substring(0, 500),
                    bullets: [],
                    notes: ""
                }
            }];
        }
    } catch (error) {
        console.error('スライド生成エラー:', error);
        throw error;
    }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});