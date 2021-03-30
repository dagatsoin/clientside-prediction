import { isObservableArray, isObservableMap } from "mobx";
import { JSONCommand, JSONOperation } from "./types";
import { isSerializedMap, SerializedMap } from "./JSON"

export function getParentAndChild(
  root: Object | Array<any> | Map<any, any>,
  path: string
): [
    | SerializedMap
    | Array<any>
    | Object
    | Map<any, any>,
    string
  ] {
  const _path = path.split("/");
  // Trim first empty segment
  if (_path[0] === "") _path.shift();
  // Extract target key.
  const targetKey = _path.pop();
  if (targetKey) {
    let parent: any = root;

    // Let's crawl to the parent of the target
    try {
      for (let i = 0; i < _path.length; i++) {
        if (parent instanceof Map || isObservableMap(parent)) {
          parent = parent.get(_path[i])
        } else if (isSerializedMap(parent)) {
          parent = parent.value.find(([id]) => id === _path[i])![1]
        } else {
          parent = parent[_path[i]];
        }
      }
    } catch (e) {
      console.error(`Bad path: ${path} does not exist on`, root, e);
    }
    return [parent, targetKey] as any;
  } else {
    throw new Error(`Bad path: no target found on path ${path}`);
  }
}

export function increment<T extends Object | Array<any>>(
  data: T,
  path: string,
  value: number
): number {
  const [parent, childKey] = getParentAndChild(data, path);
  (parent as any)[childKey] += value;
  return (parent as any)[childKey];
}

export function applyJSONCommand(
  data: {} | Array<any> | Map<any, any>,
  command: JSONCommand
) {
  const [parent, childKey] = getParentAndChild(data, command.path);
  switch (command.op) {
    case JSONOperation.add:
    case JSONOperation.replace:
      if (parent instanceof Map || isObservableMap(parent)) {
        parent.set(childKey, command.value);
      } else if (isSerializedMap(parent)) {
        parent.value.find(([id]) => id === childKey)
      } else if (Array.isArray(parent) || isObservableArray(parent)) {
        parent[Number(childKey)] = command.value;
      } else {
        (parent as any)[childKey] = command.value;
      }
      break;
    case JSONOperation.remove:
      if (parent instanceof Map || isObservableMap(parent)) {
        parent.delete(childKey);
      } else if (isSerializedMap(parent)) {
        const index = parent.value.findIndex(([id]) => id === childKey)
        if (index > -1) {
          parent.value.splice(index, 1)
        }
      } else if (Array.isArray(parent) || isObservableArray(parent)) {
        parent.splice(Number(childKey), 1);
      } else {
        delete (parent as any)[childKey];
      }
      break;
  }
}
