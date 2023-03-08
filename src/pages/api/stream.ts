import type { APIRoute } from "astro"
import {
  createParser,
  ParsedEvent,
  ReconnectInterval
} from "eventsource-parser"
import schedule from 'node-schedule';
import {Singleton} from "../../utils/Singleton"
const localEnv = import.meta.env.OPENAI_API_KEY
const vercelEnv = process.env.OPENAI_API_KEY

const apiKeys = ((localEnv || vercelEnv)?.split(/\s*\|\s*/) ?? []).filter(
  Boolean
)
schedule.scheduleJob('10 0 * * *', () => {
  const instance = Singleton.getInstance();
  console.log("清除前：",instance.getAll())
  instance.clean();
  console.log("清除后：",instance.getAll())
}); // 每天0点清除
schedule.scheduleJob('0 */1 * * * *', () => {
  const instance = Singleton.getInstance();
  console.log("清除前：",instance.getAll())
}); // 每天0点清除
export const post: APIRoute = async context => {
  const instance = Singleton.getInstance();
  const body = await context.request.json()
  const apiKey = apiKeys.length
    ? apiKeys[Math.floor(Math.random() * apiKeys.length)]
    : ""
  let { messages, key = apiKey, temperature = 0.6 } = body

  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  if (!key.startsWith("sk-")){
    key = apiKey
    console.log(context.clientAddress,'用的系统的key')
    if(!instance.addNum(context.clientAddress)){
      console.log('ip',context.clientAddress,'使用次数到达上限')
      return new Response("今天超过使用次数了,请使用自己的apikey或者明日再来")
    }
  }else{
    console.log(context.clientAddress,'用的自己的key')
  }
  if (!key) {
    return new Response("没有填写 OpenAI API key")
  }
  if (!messages) {
    return new Response("没有输入任何文字")
  }
  
  const completion = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`
    },
    method: "POST",
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      messages,
      temperature,
      stream: true
    })
  })

  const stream = new ReadableStream({
    async start(controller) {
      const streamParser = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data
          if (data === "[DONE]") {
            controller.close()
            return
          }
          try {
            // response = {
            //   id: 'chatcmpl-6pULPSegWhFgi0XQ1DtgA3zTa1WR6',
            //   object: 'chat.completion.chunk',
            //   created: 1677729391,
            //   model: 'gpt-3.5-turbo-0301',
            //   choices: [
            //     { delta: { content: '你' }, index: 0, finish_reason: null }
            //   ],
            // }
            const json = JSON.parse(data)
            const text = json.choices[0].delta?.content
            const queue = encoder.encode(text)
            controller.enqueue(queue)
          } catch (e) {
            controller.error(e)
          }
        }
      }

      const parser = createParser(streamParser)
      for await (const chunk of completion.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    }
  })

  return new Response(stream)
}
