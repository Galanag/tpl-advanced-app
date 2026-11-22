import { useEffect, useRef } from 'react';

const AdSenseBottom = () => {
  const adRef = useRef(null);

  useEffect(() => {
    try {
      if (adRef.current && !adRef.current.getAttribute('data-adsbygoogle-status')) {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (e) {
      console.error('AdSense error:', e);
    }
  }, []);

  return (
    <div className="w-full max-w-4xl mx-auto my-4 px-2 flex justify-center overflow-hidden">
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block', width: '100%' }}
        data-ad-client="ca-pub-3284731599584369"
        data-ad-slot="YOUR_AD_SLOT_ID_HERE"
        data-ad-format="horizontal"
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSenseBottom;
