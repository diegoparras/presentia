import ToolTip from '@/components/ToolTip'
import { Select, SelectItem, SelectContent, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { LLMConfig } from '@/types/llm_config'
import OpenAICompatibleImageFields from '@/components/OpenAICompatibleImageFields'
import { DALLE_3_QUALITY_OPTIONS, GPT_IMAGE_1_5_QUALITY_OPTIONS, IMAGE_PROVIDERS } from '@/utils/providerConstants'
import { Eye, EyeOff } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { MixpanelEvent, trackEvent } from '@/utils/mixpanel'

const ImageProvider = ({ llmConfig, setLlmConfig }: { llmConfig: LLMConfig, setLlmConfig: (config: any) => void }) => {
    const [showApiKey, setShowApiKey] = useState(false);
    const [openaiCompatListMeta, setOpenaiCompatListMeta] = useState<{
        modelsChecked: boolean
        modelCount: number
    }>({ modelsChecked: false, modelCount: 0 })

    useEffect(() => {
        if (llmConfig.IMAGE_PROVIDER !== 'openai_compatible') {
            setOpenaiCompatListMeta({ modelsChecked: false, modelCount: 0 })
        }
    }, [llmConfig.IMAGE_PROVIDER])
    const isImageGenerationDisabled = llmConfig.DISABLE_IMAGE_GENERATION ?? false;
    const handleChangeImageGenerationDisabled = (value: boolean) => {
        trackEvent(MixpanelEvent.Settings_Provider_Selected, {
            section: "image_provider",
            enabled: !value,
            provider: value ? "disabled" : llmConfig.IMAGE_PROVIDER || "",
        });
        setLlmConfig((prev: any) => ({
            ...prev,
            DISABLE_IMAGE_GENERATION: value
        }));
    }
    const input_field_changed = (value: string, field: string) => {
        setLlmConfig((prev: any) => ({
            ...prev,
            [field]: value
        }));
    }

    const getFieldValue = (field?: string) => {
        if (!field) return "";
        return (llmConfig as Record<string, string | undefined>)[field] || "";
    };

    const updateFieldValue = (field: string | undefined, value: string) => {
        if (!field) return;
        setLlmConfig((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    };

    const renderQualitySelector = (llmConfig: LLMConfig, input_field_changed: (value: string, field: string) => void) => {
        if (llmConfig.IMAGE_PROVIDER === "dall-e-3") {
            return (
                <div className="w-[205px] mr-0 ml-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        DALL·E 3 Image Quality
                    </label>
                    <div className="">
                        <Select value={llmConfig.DALL_E_3_QUALITY || 'standard'} onValueChange={(value) => input_field_changed(value, "DALL_E_3_QUALITY")}>
                            <SelectTrigger className="w-full h-12 px-4 py-4 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors hover:border-gray-400 justify-between">
                                <SelectValue placeholder="Select a quality" />
                            </SelectTrigger>
                            <SelectContent>
                                {DALLE_3_QUALITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                    </div>
                </div>
            );
        }

        if (llmConfig.IMAGE_PROVIDER === "gpt-image-1.5") {
            return (
                <div className="w-[205px]">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        GPT Image 1.5 Quality
                    </label>
                    <div className="">
                        <Select
                            value={llmConfig.GPT_IMAGE_1_5_QUALITY || 'low'}
                            onValueChange={(value) => input_field_changed(value, "GPT_IMAGE_1_5_QUALITY")}
                        >
                            <SelectTrigger

                                className="w-full h-12 px-4 py-4 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors hover:border-gray-400 justify-between">
                                <SelectValue placeholder="Select a quality" />
                            </SelectTrigger>
                            <SelectContent>
                                {GPT_IMAGE_1_5_QUALITY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                    </div>
                </div>
            );
        }

        return null;
    };




    return (
        <div className="space-y-6 bg-[#F9F8F8] p-7 rounded-[12px] ">
            {/* API Key Input */}
            <div className="mb-4  bg-white p-10 pt-5 rounded-[12px]">
                <ToolTip content="Enable/Disable Image Generation" className='flex justify-end items-center'>
                    <div className='flex justify-end items-center'>
                        <Switch
                            checked={!isImageGenerationDisabled}
                            className='data-[state=checked]:bg-[#4791FF] data-[state=unchecked]:bg-gray-400'
                            onCheckedChange={(checked) => handleChangeImageGenerationDisabled(!checked)}
                        />
                    </div>

                </ToolTip>
                <div className='flex items-center justify-between'>


                    <div className=" max-w-[290px] pb-[50px]">
                        <div className='w-[60px] h-[60px] px-[13.5px] py-[14.2px] rounded-[4px] flex items-center justify-center'
                            style={{ backgroundColor: '#F4F3FF' }}
                        >
                            <img src="/image-markup.svg" className='w-full h-full object-cover' alt='image-markup' />
                        </div>
                        <h3 className="text-xl font-normal text-[#191919] py-2.5">Image Generation Settings</h3>
                        <p className=" text-sm  text-gray-500">
                            Choosing where images come from
                        </p>
                    </div>
                    <div className=' '>

                        <div className='flex items-center justify-end gap-4'>

                            {!isImageGenerationDisabled && (
                                <>
                                    {/* Image Provider Selection */}
                                    <div className="">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Select Image Provider
                                        </label>
                                        <div className="grid w-full grid-cols-2 gap-3">
                                            {Object.values(IMAGE_PROVIDERS).map((provider) => (
                                                <button
                                                    type="button"
                                                    key={provider.value}
                                                    onClick={() => {
                                                        trackEvent(MixpanelEvent.Settings_Provider_Selected, {
                                                            section: "image_provider",
                                                            provider: provider.value,
                                                        });
                                                        input_field_changed(provider.value, "IMAGE_PROVIDER");
                                                    }}
                                                    className={cn(
                                                        "flex min-h-24 min-w-28 flex-col items-center justify-center gap-2 rounded-xl border p-3 text-center transition-colors hover:bg-[#F7F6F9]",
                                                        llmConfig.IMAGE_PROVIDER === provider.value
                                                            ? "border-[#7A5AF8] bg-[#F4F3FF]"
                                                            : "border-[#EDEEEF] bg-white"
                                                    )}
                                                >
                                                    <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#EDEEEF] bg-white">
                                                        {provider.icon
                                                            ? <img src={provider.icon} alt="" className="h-7 w-7 object-contain" />
                                                            : <span className="text-sm font-semibold">{provider.label.slice(0, 1)}</span>}
                                                    </span>
                                                    <span className="text-xs font-semibold text-[#191919]">{provider.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>



                                    {/* Dynamic API Key Input for Image Provider */}
                                    {llmConfig.IMAGE_PROVIDER &&
                                        IMAGE_PROVIDERS[llmConfig.IMAGE_PROVIDER] &&
                                        (() => {
                                            const provider = IMAGE_PROVIDERS[llmConfig.IMAGE_PROVIDER];



                                            if (provider.value === "openai_compatible") {
                                                return (
                                                    <OpenAICompatibleImageFields
                                                        layout="textProviderSettings"
                                                        baseUrl={llmConfig.OPENAI_COMPAT_IMAGE_BASE_URL || ""}
                                                        apiKey={llmConfig.OPENAI_COMPAT_IMAGE_API_KEY || ""}
                                                        model={llmConfig.OPENAI_COMPAT_IMAGE_MODEL || ""}
                                                        onBaseUrlChange={(v) => {
                                                            setLlmConfig((prev: any) => ({ ...prev, OPENAI_COMPAT_IMAGE_BASE_URL: v }));
                                                        }}
                                                        onApiKeyChange={(v) => {
                                                            setLlmConfig((prev: any) => ({ ...prev, OPENAI_COMPAT_IMAGE_API_KEY: v }));
                                                        }}
                                                        onModelChange={(v) => {
                                                            setLlmConfig((prev: any) => ({ ...prev, OPENAI_COMPAT_IMAGE_MODEL: v }));
                                                        }}
                                                        onModelListMetaChange={setOpenaiCompatListMeta}
                                                    />
                                                );
                                            }

                                            // Show ComfyUI configuration
                                            if (provider.value === "comfyui") {
                                                return (
                                                    <div className=" space-y-4">
                                                        <div className='w-[205px]'>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                ComfyUI Server URL
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="http://192.168.1.7:8188"
                                                                    className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                    value={llmConfig.COMFYUI_URL || ""}
                                                                    onChange={(e) => {
                                                                        input_field_changed(
                                                                            e.target.value,
                                                                            "COMFYUI_URL"
                                                                        );
                                                                    }}
                                                                />
                                                            </div>

                                                        </div>

                                                    </div>
                                                );
                                            }

                                            // Show Open WebUI configuration
                                            if (provider.value === "open_webui") {
                                                return (
                                                    <div className="space-y-4">
                                                        <div className='w-[205px]'>
                                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                Open WebUI URL
                                                            </label>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    placeholder="http://localhost:3000/api/v1"
                                                                    className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                                    value={llmConfig.OPEN_WEBUI_IMAGE_URL || ""}
                                                                    onChange={(e) => {
                                                                        input_field_changed(
                                                                            e.target.value,
                                                                            "OPEN_WEBUI_IMAGE_URL"
                                                                        );
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            // Show API key input for other providers
                                            return (
                                                <div className=" w-[205px]">
                                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                                        {provider.apiKeyFieldLabel}
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            type={showApiKey ? 'text' : 'password'}
                                                            placeholder={`Enter your ${provider.apiKeyFieldLabel}`}
                                                            className="w-full px-4 py-2.5 h-12 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                                            value={getFieldValue(provider.apiKeyField)}
                                                            onChange={(e) =>
                                                                updateFieldValue(
                                                                    provider.apiKeyField,
                                                                    e.target.value
                                                                )
                                                            }
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowApiKey((prev) => !prev)}
                                                            className='absolute right-2 top-1/2 -translate-y-1/2 bg-white px-2 py-1 cursor-pointer'
                                                        >
                                                            {showApiKey ? <Eye className='w-4 h-4 text-gray-500' /> : <EyeOff className='w-4 h-4 text-gray-500' />}
                                                        </button>
                                                    </div>

                                                </div>
                                            );
                                        })()}

                                </>
                            )}
                        </div>
                        {!isImageGenerationDisabled && <div className='flex justify-end items-center mt-[18px]'>

                            {renderQualitySelector(llmConfig, input_field_changed)}
                            {llmConfig.IMAGE_PROVIDER === "open_webui" && (
                                <div className='w-[205px]'>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        API Key (optional)
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showApiKey ? 'text' : 'password'}
                                            placeholder="API key"
                                            className="w-full px-4 py-2.5 h-12 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                            value={llmConfig.OPEN_WEBUI_IMAGE_API_KEY || ""}
                                            onChange={(e) => {
                                                input_field_changed(e.target.value, "OPEN_WEBUI_IMAGE_API_KEY");
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowApiKey((prev) => !prev)}
                                            className='absolute right-2 top-1/2 -translate-y-1/2 bg-white px-2 py-1 cursor-pointer'
                                        >
                                            {showApiKey ? <Eye className='w-4 h-4 text-gray-500' /> : <EyeOff className='w-4 h-4 text-gray-500' />}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {llmConfig.IMAGE_PROVIDER === "comfyui" && <div className='w-full'>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Workflow JSON
                                </label>
                                <div className="relative">
                                    <textarea
                                        placeholder='Paste your ComfyUI workflow JSON here (export via "Export (API)" in ComfyUI)'
                                        className="w-full px-4 py-2.5 outline-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors font-mono text-xs"
                                        rows={3}
                                        value={llmConfig.COMFYUI_WORKFLOW || ""}
                                        onChange={(e) => {
                                            input_field_changed(
                                                e.target.value,
                                                "COMFYUI_WORKFLOW"
                                            );
                                        }}
                                    />
                                </div>

                            </div>}
                        </div>}
                    </div>
                </div>
            </div>

            {!isImageGenerationDisabled &&
                llmConfig.IMAGE_PROVIDER === "openai_compatible" &&
                openaiCompatListMeta.modelsChecked &&
                openaiCompatListMeta.modelCount === 0 && (
                    <>
                        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
                            <p className="text-sm text-yellow-800">
                                No models found. Please make sure your provider credentials are valid and the selected provider is reachable.
                            </p>
                        </div>
                        <div className="flex w-full justify-end">
                            <div className="w-[205px]">
                                <label className="mb-2 block text-sm font-medium text-gray-700">Image model id</label>
                                <input
                                    type="text"
                                    placeholder="e.g. dall-e-3, gpt-image-1"
                                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                    value={llmConfig.OPENAI_COMPAT_IMAGE_MODEL || ""}
                                    onChange={(e) => {
                                        setLlmConfig((prev: any) => ({
                                            ...prev,
                                            OPENAI_COMPAT_IMAGE_MODEL: e.target.value,
                                        }));
                                    }}
                                />
                            </div>
                        </div>
                    </>
                )}


            {/* Web Grounding Toggle - show at the end, below models dropdown */}
            {/* <div className="bg-white flex justify-between items-center p-10 rounded-[12px]">
                <div className=' max-w-[290px]'>

                    <h4 className="text-xl font-normal text-[#191919]">Advanced</h4>
                    <p className="mt-2.5 text-sm  text-gray-500">
                        Configure advanced AI features.
                    </p>
                </div>
                <div className="flex items-center gap-4">

                    <div className="w-[275px]">



                    </div>
                    <div className="w-[295px]"></div>
                </div>

            </div> */}


        </div>
    )
}

export default ImageProvider
