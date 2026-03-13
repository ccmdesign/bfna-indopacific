/** @deprecated BF-111: safe to remove once MarineTraffic embed is validated */
import type { StraitFlowConfig } from '~/utils/particleEngine'
import { hormuzFlowConfig } from './hormuz-flow'
import { luzonFlowConfig } from './luzon-flow'
import { taiwanFlowConfig } from './taiwan-flow'
import { babElMandebFlowConfig } from './bab-el-mandeb-flow'
import { malaccaFlowConfig } from './malacca-flow'
import { lombokFlowConfig } from './lombok-flow'

export { hormuzFlowConfig } from './hormuz-flow'
export { luzonFlowConfig } from './luzon-flow'
export { taiwanFlowConfig } from './taiwan-flow'
export { babElMandebFlowConfig } from './bab-el-mandeb-flow'
export { malaccaFlowConfig } from './malacca-flow'
export { lombokFlowConfig } from './lombok-flow'

/** Lookup map: straitId -> flow config */
export const flowConfigs: Record<string, StraitFlowConfig> = {
  hormuz: hormuzFlowConfig,
  luzon: luzonFlowConfig,
  taiwan: taiwanFlowConfig,
  'bab-el-mandeb': babElMandebFlowConfig,
  malacca: malaccaFlowConfig,
  lombok: lombokFlowConfig,
}
