export function parse(template: string, values: any) {
    return template.replace(/\{([^}]+)\}/g, (_, expression) => {
      try {
        const keys = expression.split(".");
        let val = values;
  
        for (const key of keys) {
          if (val == null) return "";
          val = val[key];
        }
  
        if (val == null) return "";
        return String(val);
      } catch {
        return "";
      }
    });
  }
  