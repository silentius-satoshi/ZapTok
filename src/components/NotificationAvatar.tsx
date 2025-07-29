import React from 'react';

interface NotificationAvatarProps {
  number: number | undefined;
  size?: "xxs" | "xs" | "vs" | "sm" | "md" | "lg" | "xl" | "xxl";
  verified?: string;
  id?: string;
}

const NotificationAvatar: React.FC<NotificationAvatarProps> = (props) => {
  const selectedSize = props.size || 'sm';

  const sizeClasses = {
    xxs: 'w-6 h-6 text-xs',
    xs: 'w-9 h-9 text-xs',
    vs: 'w-10 h-10 text-xs',
    sm: 'w-12 h-12 text-sm',
    md: 'w-13 h-13 text-base',
    lg: 'w-18 h-18 text-lg',
    xl: 'w-20 h-20 text-xl',
    xxl: 'w-36 h-36 text-2xl',
  };

  return (
    <div 
      id={props.id} 
      className={`
        ${sizeClasses[selectedSize]} 
        relative
        bg-muted-foreground/20
        rounded-full
        text-muted-foreground
        font-semibold
        flex
        items-center
        justify-center
      `}
    >
      {props.number ? `+${props.number}` : (
        <div className="w-full h-full bg-muted-foreground/10 rounded-full"></div>
      )}
    </div>
  );
};

export default NotificationAvatar;
