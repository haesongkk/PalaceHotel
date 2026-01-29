export default function Footer() {
  const companyInfo = {
    companyName: process.env.NEXT_PUBLIC_COMPANY_NAME,
    representative: process.env.NEXT_PUBLIC_COMPANY_REPRESENTATIVE,
    businessNumber: process.env.NEXT_PUBLIC_COMPANY_BUSINESS_NUMBER,
    address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS,
    phone: process.env.NEXT_PUBLIC_COMPANY_PHONE,
  };

  return (
    <footer className="mt-auto border-t border-gray-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-sm text-gray-600 space-y-1">
          <p><span className="font-medium text-gray-700">상호</span> {companyInfo.companyName}</p>
          <p><span className="font-medium text-gray-700">대표자명</span> {companyInfo.representative}</p>
          <p><span className="font-medium text-gray-700">사업자등록번호</span> {companyInfo.businessNumber}</p>
          <p><span className="font-medium text-gray-700">사업장 주소</span> {companyInfo.address}</p>
          <p>
            <span className="font-medium text-gray-700">고객센터</span>{' '}
            <a href={`tel:${companyInfo.phone}`} className="text-blue-600 hover:underline">{companyInfo.phone}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
