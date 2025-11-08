/// <reference types="unlayer-types/embed" />
import { CSSProperties } from 'react';
import Embed from 'embed/index';
import { Editor as EditorClass } from 'embed/Editor';
import { AppearanceConfig, DisplayMode, ToolsConfig } from 'state/types/types';
export declare type Unlayer = typeof Embed;
export declare type UnlayerOptions = Parameters<Unlayer['createEditor']>[0];
export declare type Editor = InstanceType<typeof EditorClass>;
export interface EditorRef {
    editor: Editor | null;
}
export interface EmailEditorProps {
    editorId?: string | undefined;
    minHeight?: number | string | undefined;
    onLoad?(unlayer: Editor): void;
    onReady?(unlayer: Editor): void;
    options?: UnlayerOptions | undefined;
    scriptUrl?: string | undefined;
    style?: CSSProperties | undefined;
    /** @deprecated */
    appearance?: AppearanceConfig | undefined;
    /** @deprecated */
    displayMode?: DisplayMode;
    /** @deprecated */
    locale?: string | undefined;
    /** @deprecated */
    projectId?: number | undefined;
    /** @deprecated */
    tools?: ToolsConfig | undefined;
}
declare global {
    const unlayer: Unlayer;
    interface Window {
        __unlayer_lastEditorId: number;
    }
}
