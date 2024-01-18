import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';
import { OpenAIModelID, OpenAITokenizers } from '@/types/openai'

import { ChatBody, Message } from '@/types/chat';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt, temperature } = (await req.json()) as ChatBody;

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const tokenizer = OpenAITokenizers[model.id as OpenAIModelID];
    const prompt_tokens = tokenizer.encode(promptToSend, false);

    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = tokenizer.encode(message.content, false);
      console.log("model",model)
      console.log("message",message)
     // console.log("tokens",tokens)
      console.log("tokenCount",tokenCount)
      console.log("model.tokenLimit",model.tokenLimit)
      model.tokenLimit = 4096;
      console.log("tokenCount + tokens.length + 768",tokenCount + tokens.length + 768)
      if (tokenCount + tokens.length + 768 > model.tokenLimit) {
      //if (tokenCount + tokens.length + 768 > 4096) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }
    console.log("messagesToSend",messagesToSend);
    const stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend);

    return new Response(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
