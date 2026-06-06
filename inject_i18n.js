const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/pages/**/*.tsx');

files.forEach(file => {
  if (file.includes('_app.tsx') || file.includes('_document.tsx')) return;
  
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('getServerSideProps') || content.includes('getStaticProps')) return;
  
  const importStr = "import { serverSideTranslations } from 'next-i18next/serverSideTranslations';\n";
  const propsStr = `\nexport const getStaticProps = async ({ locale }: any) => ({\n  props: {\n    ...(await serverSideTranslations(locale ?? 'en', ['common'])),\n  },\n});\n`;
  
  content = importStr + content + propsStr;
  fs.writeFileSync(file, content);
  console.log(`Injected into ${file}`);
});
