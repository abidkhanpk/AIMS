import { NextApiRequest, NextApiResponse } from 'next';

// Templates removed; keep endpoint returning empty for compatibility
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    return res.status(200).json([]);
  }
  return res.status(405).json({ message: 'Templates feature removed' });
}
