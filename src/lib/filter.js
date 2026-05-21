import { Filter } from 'bad-words'

const filter = new Filter()

export function isProfane(str) {
  return filter.isProfane(str)
}

export function clean(str) {
  return filter.clean(str)
}
