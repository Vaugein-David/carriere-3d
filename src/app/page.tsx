'use client';

import dynamic from 'next/dynamic';

// Rendu côté navigateur uniquement : la vue lit la langue mémorisée et les paramètres d'URL
export default dynamic(() => import('@/views/Accueil'), { ssr: false, loading: () => <div className="boot" /> });
