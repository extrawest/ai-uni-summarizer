import { NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { createStuffDocumentsChain } from "langchain/chains/combine_documents";
import { YoutubeLoader } from "@langchain/community/document_loaders/web/youtube";
import { PuppeteerWebBaseLoader } from "@langchain/community/document_loaders/web/puppeteer";

const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;

export const POST = async (request: Request) => {
  const body = await request.json();
  const { groqApiKey, link, temperature } = body;

  if (!groqApiKey) {
    return NextResponse.json(
      { error: "groqApiKey is required" },
      { status: 400 }
    );
  }
  if (!link) {
    return NextResponse.json({ error: "link is required" }, { status: 400 });
  }

  try {
    const llm = new ChatGroq({
      apiKey: groqApiKey,
      temperature,
    });

    const systemTemplate = [
      `You are an assistant for summarising content context.`,
      `Use the following pieces of retrieved context to summarise`,
      `youtube video or website content. Also you need to provide title of the video or website.`,
      `The title always should be in the first line of the summary.`,
      `If you don't know the what this video or website about, say that you`,
      `don't know. Use ten sentences maximum and keep the answer concise.`,
      `\n\n`,
      `{context}`,
    ].join("");

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", systemTemplate],
    ]);

    const chain = await createStuffDocumentsChain({
      llm,
      outputParser: new StringOutputParser(),
      prompt,
    });

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

    const response = await chain.invoke({
      context: docs,
    });

    return NextResponse.json({ message: response }, { status: 200 });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
};
