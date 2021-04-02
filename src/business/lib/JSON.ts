function replacer(_: any, value: any) {
  if(value instanceof Map) {
    return {
      dataType: 'Map',
      value: [...value]
    };
  } else {
    return value;
  }
}

function reviver(_: any, value: any) {
  if (typeof value === "object" && "dataType" in value) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
}

export type SerializedMap = {dataType: "Map", value: Array<[string, any]>}

export function isSerializedMap(value: any): value is SerializedMap {
  return value.dataType === "Map"
}

const stringify = (value: any | undefined): string => JSON.stringify(value, replacer)
const parse = <T=any>(text: string): T => JSON.parse(text, reviver)

export {
  stringify,
  parse
}