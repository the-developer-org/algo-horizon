import { NextRequest, NextResponse } from 'next/server';
import { fetchKeyMapping } from '@/utils/apiUtils';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const company = searchParams.get('company');

  if (!company) {
    return NextResponse.json({ error: 'Company parameter is required' }, { status: 400 });
  }

  try {
    // Fetch the KeyMapping from Upstash Redis
    const keyMapping = await fetchKeyMapping();

    // Check if the company exists in the mapping
    const instrumentKey = keyMapping[company];

    if (!instrumentKey) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Return company information
    const companyInfo = {
      name: company,
      symbol: instrumentKey,
    };

    return NextResponse.json(companyInfo);
  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json({ error: 'Failed to fetch company data' }, { status: 500 });
  }
}