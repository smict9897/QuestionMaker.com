import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'], // অ্যাডমিন ও এপিআই বাদে সব পেজ গুগল পড়তে পারবে
    },
    sitemap: 'https://saifulsir.com/sitemap.xml',
  };
}
