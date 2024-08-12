import { NextResponse } from "next/server";
import { OpenAI } from "@langchain/openai";

import { ChatGroq } from "@langchain/groq";
import { OpenAIEmbeddings } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createRetrievalChain } from "langchain/chains/retrieval";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

export const POST = async (request: Request) => {
  const body = await request.json();
  const { groqApiKey, link, temperature } = body;
  const localLLMUrl = process.env.LOCAL_LLM_URL;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!localLLMUrl && !groqApiKey) {
    return NextResponse.json(
      { error: "groqApiKey is required if LOCAL_LLM_URL is not set" },
      { status: 400 }
    );
  }

  if (!openaiApiKey && !localLLMUrl) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is required if LOCAL_LLM_URL is not set" },
      { status: 400 }
    );
  }

  if (!link) {
    return NextResponse.json({ error: "link is required" }, { status: 400 });
  }

  try {
    const embeddings = new OpenAIEmbeddings(
      {},
      {
        ...(localLLMUrl ? { baseURL: localLLMUrl } : {}),
      }
    );

    const llm = groqApiKey
      ? new ChatGroq({
          apiKey: groqApiKey,
          temperature,
        })
      : new OpenAI(
          { temperature },
          {
            baseURL: localLLMUrl,
          }
        );

    const systemTemplate = [
      `You are an assistant for summarising content.`,
      `Use the following pieces of retrieved context to summarise youtube video or website content.`,
      `Provide only title and summary, nothing more.`,
      `The title always should be in the first line of the summary.`,
      `If you don't know the answer, say that you don't know.`,
      `Use ten sentences maximum and keep the answer concise.`,
      `\n\n`,
      `{context}`,
    ].join("");

    let youtubeLoader: YoutubeLoader | null = null;
    let webpageLoader: PuppeteerWebBaseLoader | null = null;
    if (youtubeRegex.test(link)) {
      youtubeLoader = YoutubeLoader.createFromUrl(link);
    } else {
      webpageLoader = new PuppeteerWebBaseLoader(link, {});
    }
    const docs = youtubeRegex.test(link)
      ? (await youtubeLoader?.load()) || []
      : (await webpageLoader?.load()) || [];

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemTemplate],
    ]);

    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splits = await textSplitter.splitDocuments(docs);
    const vectorstore = await MemoryVectorStore.fromDocuments(
      splits,
      embeddings
    );

    const retriever = vectorstore.asRetriever();
    const questionAnswerChain = await createStuffDocumentsChain({
      llm,
      prompt,
      outputParser: new StringOutputParser(),
    });
    const ragChain = await createRetrievalChain({
      retriever,
      combineDocsChain: questionAnswerChain,
    });

    const response = await ragChain.invoke({
      input: "Give me a summary of context.",
    });
    const { answer } = response;

    return NextResponse.json({ message: answer }, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
};
