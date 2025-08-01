import {
    Root,
    Trigger,
    Value,
    Icon,
    Portal,
    Content,
    Viewport,
    Item,
    ItemText,
} from "@radix-ui/react-select";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import { Input, input } from "../Input/Input.tsx";
import { IconChevronGrabberVertical } from "../Icons/IconChevronGrabberVertical.tsx";
import { tv } from "tailwind-variants";
import { Children, type ComponentProps, type PropsWithChildren } from "react";
import { IconMagnifyingGlass } from "../Icons/IconMagnifyingGlass.tsx";
import { Spinner } from "../Spinner/Spinner.tsx";

type Props<T> = PropsWithChildren<
    {
        id?: string;
        placeholder?: string;
        onValueChange?: (s: NonNullable<T>) => void;
        variant?: "default" | "editor" | "dashed";
        invalid?: boolean;
        disabled?: boolean;
        className?: string;
        value?: T;
        searchValue?: string;
        onSearch?: (s: string) => void;
        searchPlaceholder?: string;
        loading?: boolean;
    } & Omit<ComponentProps<typeof Root>, "onChange" | "value">
>;

const select = tv({
    slots: {
        trigger:
            "flex justify-between items-center data-placeholder:text-txt-tertiary whitespace-nowrap cursor-pointer *:first:contents",
        content:
            "z-100 shadow-mid rounded-[10px] bg-level-1 p-1 animate-in fade-in slide-in-from-top-2 overflow-y-auto overflow-y-auto",
        icon: "-mr-1",
    },
    variants: {
        invalid: {
            true: {
                trigger: "border-border-danger",
            },
        },
        disabled: {
            true: {
                trigger: "opacity-60",
            },
        },
        loading: {
            true: {
                trigger: "opacity-60",
            },
        },
        variant: {
            dashed: {
                trigger: input({
                    class: "w-full gap-4 border-dashed pointer-events-none",
                }),
            },
            editor: {
                trigger:
                    "bg-highlight hover:bg-highlight-hover active:bg-highlight-pressed text-txt-primary text-sm px-[10px] py-[6px] rounded-lg w-max gap-2",
            },
            default: {
                trigger: input({ class: "w-full gap-4 " }),
            },
        },
    },
    compoundVariants: [
        {
            invalid: true,
            variant: "default",
            class: {
                trigger: "border-border-danger",
            },
        },
    ],
    defaultVariants: {
        variant: "default",
    },
});

export function Select<T>({
    placeholder,
    children,
    onValueChange,
    value,
    searchValue,
    onSearch,
    searchPlaceholder,
    loading,
    ...props
}: Props<T>) {
    const { trigger, content, icon } = select({
        ...props,
    });

    return (
        <Root onValueChange={onValueChange} value={value as string}>
            <Trigger
                {...props}
                className={trigger({
                    className: props.className,
                    disabled: props.disabled,
                })}
            >
                <Value placeholder={placeholder} />
                <Icon className={icon()}>
                    {loading ? (
                        <Spinner size={16} />
                    ) : (
                        <IconChevronGrabberVertical size={16} />
                    )}
                </Icon>
            </Trigger>
            <Portal>
                <Content
                    className={content()}
                    position="popper"
                    sideOffset={5}
                    style={{
                        minWidth: "var(--radix-select-trigger-width)",
                        maxHeight:
                            "var(--radix-select-content-available-height)",
                    }}
                >
                    {onSearch && (
                        <Input
                            // Prevent radix behaviour
                            onBlurCapture={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                            }}
                            autoFocus
                            icon={IconMagnifyingGlass}
                            placeholder={searchPlaceholder}
                            value={searchValue}
                            onChange={(e) => onSearch(e.target.value)}
                        />
                    )}
                    <ScrollArea.Root className="ScrollAreaRoot" type="auto">
                        <Viewport asChild>
                            <ScrollArea.Viewport className="ScrollAreaViewport">
                                {children}
                            </ScrollArea.Viewport>
                        </Viewport>
                    </ScrollArea.Root>
                </Content>
            </Portal>
        </Root>
    );
}

export function Option({ children, ...props }: ComponentProps<typeof Item>) {
    const hasSingleChildren = Children.count(children) <= 1;
    return (
        <Item
            {...props}
            className={
                "flex gap-2 items-center min-h-8 py-1 text-sm font-medium text-txt-primary hover:bg-tertiary-hover active:bg-tertiary-pressed cursor-pointer px-[10px] text-start"
            }
        >
            <ItemText asChild>
                <span
                    className={
                        hasSingleChildren
                            ? "text-ellipsis overflow-hidden"
                            : "flex gap-2 items-center"
                    }
                >
                    {children}
                </span>
            </ItemText>
        </Item>
    );
}
