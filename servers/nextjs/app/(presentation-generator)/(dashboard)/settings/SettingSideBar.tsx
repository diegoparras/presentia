"use client";
import React from 'react'
import { LogOut, Search, Shield } from 'lucide-react'
import { IMAGE_PROVIDERS, LLM_PROVIDERS } from '@/utils/providerConstants'
import { useSelector } from 'react-redux'
import { RootState } from '@/store/store'
import { useI18n } from '@/lib/i18n'

export type SettingsSection = 'text-provider' | 'image-provider' | 'web-search-provider' | 'privacy' | 'session'

const SettingSideBar = ({ selectedProvider, setSelectedProvider }: { selectedProvider: SettingsSection, setSelectedProvider: (provider: SettingsSection) => void }) => {
    const { t } = useI18n()
    const { llm_config } = useSelector((state: RootState) => state.userConfig)
    const textProviderIcon = LLM_PROVIDERS[llm_config.LLM as keyof typeof LLM_PROVIDERS]?.icon
    const imageProviderIcon = IMAGE_PROVIDERS[llm_config.IMAGE_PROVIDER as keyof typeof IMAGE_PROVIDERS]?.icon || '/providers/pexel.png'
    return (
        <div className='w-full max-w-[230px] h-screen px-3 pt-[22px] bg-[#F9FAFB] flex flex-col'>
            <p className='text-xs text-black  font-medium border-b mt-[3.15rem]  border-[#E1E1E5] pb-3.5'>{t("set.side.filterBy")}</p>
            <div className='mt-6 flex-1'>
                <p className='text-[#3A3A3A] text-xs font-medium pb-2.5'>{t("set.side.selectProvider")}</p>
                <div className='space-y-2.5'>
                    <button className={` w-full rounded-[6px] px-3 py-4 flex items-center gap-1.5 border  ${selectedProvider === 'text-provider' ? 'bg-[#FAEEE3] border-[#D9D6FE]' : 'bg-white border-[#EDEEEF]'}`} onClick={() => setSelectedProvider('text-provider')}>
                        <div className='relative w-[18px] h-[18px] rounded-full overflow-hidden border border-[#EDEEEF]'>

                            <img src={textProviderIcon} className=' object-cover w-full h-full overflow-hidden' alt='google' />
                        </div>
                        <p className='text-[#191919] text-xs  font-medium' >{t("set.side.textProvider")}</p>
                    </button>
                    <button className={` w-full rounded-[6px] px-3 py-4 flex items-center gap-1.5 border  ${selectedProvider === 'image-provider' ? 'bg-[#FAEEE3] border-[#D9D6FE]' : 'bg-white border-[#EDEEEF]'}`} onClick={() => setSelectedProvider('image-provider')}>
                        <div className='relative w-[18px] h-[18px] rounded-full overflow-hidden border border-[#EDEEEF]'>
                            <img src={imageProviderIcon} className=' object-cover w-full h-full overflow-hidden' alt='google' />
                        </div>
                        <p className='text-[#191919] text-xs  font-medium' >{t("set.side.imageProvider")}</p>
                    </button>
                    <button className={` w-full rounded-[6px] px-3 py-4 flex items-center gap-1.5 border  ${selectedProvider === 'web-search-provider' ? 'bg-[#FAEEE3] border-[#D9D6FE]' : 'bg-white border-[#EDEEEF]'}`} onClick={() => setSelectedProvider('web-search-provider')}>
                        <div className='relative w-[18px] h-[18px] rounded-full overflow-hidden border border-[#EDEEEF] flex items-center justify-center bg-white'>
                            <Search className='w-3 h-3 text-[#c2571f]' />
                        </div>
                        <p className='text-[#191919] text-xs font-medium'>{t("set.side.webSearchProvider")}</p>
                    </button>
                </div>
            </div>

            <div className='border-t border-[#E1E1E5] py-5 relative z-50'>
                <p className='text-[#3A3A3A] text-xs font-medium pb-2.5'>{t("set.side.other")}</p>
                <div className='space-y-2.5'>
                    <button
                        className={`w-full rounded-[6px] p-3 py-4 flex items-center gap-1.5 border ${selectedProvider === 'privacy' ? 'bg-[#FAEEE3] border-[#D9D6FE]' : 'bg-white border-[#EDEEEF]'}`}
                        onClick={() => setSelectedProvider('privacy')}
                    >
                        <div className='relative w-6 h-6 rounded-full overflow-hidden border border-[#EDEEEF] flex items-center justify-center bg-white'>
                            <Shield className='w-3.5 h-3.5 text-[#c2571f]' />
                        </div>
                        <p className='text-[#191919] text-xs font-medium'>{t("set.side.usageAnalytics")}</p>
                    </button>
                    <button
                        className={`w-full rounded-[6px] p-3 py-4 flex items-center gap-1.5 border ${selectedProvider === 'session' ? 'bg-[#FAEEE3] border-[#D9D6FE]' : 'bg-white border-[#EDEEEF]'}`}
                        onClick={() => setSelectedProvider('session')}
                    >
                        <div className='relative w-6 h-6 rounded-full overflow-hidden border border-[#EDEEEF] flex items-center justify-center bg-white'>
                            <LogOut className='w-3.5 h-3.5 text-[#c2571f]' />
                        </div>
                        <p className='text-[#191919] text-xs font-medium'>{t("set.side.signOut")}</p>
                    </button>
                </div>
            </div>
        </div>
    )
}

export default SettingSideBar
