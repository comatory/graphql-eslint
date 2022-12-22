import { GraphQLESLintRule } from '../types';
import { requireSiblingsOperations } from '@graphql-eslint/eslint-plugin';
import { CWD } from '../utils';
import { relative } from 'path';
import { GraphQLESTreeNode } from '../estree-converter';
import { NameNode, visit } from 'graphql';

const RULE_ID = 'no-one-place-fragments';

export const rule: GraphQLESLintRule = {
  meta: {
    type: 'suggestion',
    docs: {
      category: 'Operations',
      description: 'Disallow fragments that are used only in one place.',
      url: `https://github.com/B2o5T/graphql-eslint/blob/master/docs/rules/${RULE_ID}.md`,
      examples: [
        {
          title: 'Incorrect',
          code: /* GraphQL */ `
            fragment UserFields on User {
              id
            }

            {
              user {
                ...UserFields
                friends {
                  ...UserFields
                }
              }
            }
          `,
        },
        {
          title: 'Correct',
          code: /* GraphQL */ `
            fragment UserFields on User {
              id
            }

            {
              user {
                ...UserFields
              }
            }
          `,
        },
      ],
      requiresSiblings: true,
    },
    messages: {
      [RULE_ID]: 'Fragment `{{fragmentName}}` used only once. Inline him in "{{filePath}}".',
    },
    schema: [],
  },
  create(context) {
    const operations = requireSiblingsOperations(RULE_ID, context);
    const allDocuments = [...operations.getOperations(), ...operations.getFragments()];

    const usedFragmentsMap: Record<string, string[]> = Object.create(null);

    for (const { document, filePath } of allDocuments) {
      const relativeFilePath = relative(CWD, filePath);
      visit(document, {
        FragmentSpread({ name }) {
          const spreadName = name.value;
          usedFragmentsMap[spreadName] ||= [];
          usedFragmentsMap[spreadName].push(relativeFilePath);
        },
      });
    }

    return {
      'FragmentDefinition > Name'(node: GraphQLESTreeNode<NameNode>) {
        const fragmentName = node.value;
        const fragmentUsage = usedFragmentsMap[fragmentName];

        if (fragmentUsage.length === 1) {
          context.report({
            node,
            messageId: RULE_ID,
            data: { fragmentName, filePath: fragmentUsage[0] },
          });
        }
      },
    };
  },
};