/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { XiaoyaClient } from '@/lib/xiaoya.client';

export const runtime = 'nodejs';

/**
 * GET /api/xiaoya/search?keyword=<keyword>&page=<page>
 * 搜索小雅视频
 */
export async function GET(request: NextRequest) {
  try {
    const authInfo = getAuthInfoFromCookie(request);
    if (!authInfo || !authInfo.username) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword');
    const page = parseInt(searchParams.get('page') || '1');

    if (!keyword) {
      return NextResponse.json({ error: '缺少搜索关键词' }, { status: 400 });
    }

    const config = await getConfig();
    const xiaoyaConfig = config.XiaoyaConfig;

    if (
      !xiaoyaConfig ||
      !xiaoyaConfig.Enabled ||
      !xiaoyaConfig.ServerURL
    ) {
      return NextResponse.json({ error: '小雅未配置或未启用' }, { status: 400 });
    }

    const client = new XiaoyaClient(
      xiaoyaConfig.ServerURL,
      xiaoyaConfig.Username,
      xiaoyaConfig.Password,
      xiaoyaConfig.Token
    );

    const result = await client.search(keyword, page, 50);

    // 只返回视频文件
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.m3u8', '.flv', '.ts', '.mov', '.wmv', '.webm'];

    const videos = result.content
      .filter(item =>
        !item.is_dir &&
        videoExtensions.some(ext => item.name.toLowerCase().endsWith(ext))
      )
      .map(item => ({
        name: item.name,
        path: item.name, // Alist 搜索返回的是完整路径
      }));

    return NextResponse.json({
      videos,
      total: result.total,
      page,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
