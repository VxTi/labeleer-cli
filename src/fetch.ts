import { z, type ZodObject } from 'zod';

export default async function makeRequest<T extends ZodObject>(
  endpoint: Endpoint,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  config: {
    accessToken: string;
    decoder?: T;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<z.infer<T> | undefined> {
  const path = `https://labeleer.com/api/${endpoint}`;
  return await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(config?.headers ?? {}),
      Authorization: `Bearer ${config.accessToken}`,
      'User-Agent': 'Labeleer-CLI',
    },
  })
    .then(res => res.json())
    .then(res => {
      if (!config.decoder) return;

      const decoded = config.decoder.safeParse(res);
      if (!decoded.success) {
        return undefined;
      }

      return decoded.data;
    });
}

export type Endpoint =
  | `/project/${string}/locale`
  | `/project/${string}/locale/${string}`
  | `/project/${string}/translations`
  | `/project/${string}/translations/${string}`
  | `/project/${string}/translations/export`;

export const LocaleResponseDecoder = z.object({
  data: z.array(
    z.object({
      locale: z.string(),
      isReference: z.boolean(),
      id: z.string(),
      createdAt: z.string(),
    })
  ),
});
